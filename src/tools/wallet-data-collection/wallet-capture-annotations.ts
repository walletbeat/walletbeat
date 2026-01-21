import fs from 'node:fs'
import path from 'node:path'

import {
	CollectionPolicy,
	collectionPolicyEnum,
	type DataCollectionPurpose,
	dataCollectionPurpose,
} from '@/schema/features/privacy/data-collection'
import { type AtLeastOneTrueVariant, Variant, variantEnum } from '@/schema/variants'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	type NonEmptySet,
	nonEmptySetFromArray,
	setItems,
} from '@/types/utils/non-empty'

import { expectArray, expectOptionalString, expectRecord, expectString } from './json-utils'
import type { WalletRequest } from './wallet-capture-file'

export interface EncodedWalletCaptureAnnotations {
	matchers: EncodedWalletRequestMatcher[]
}

export interface EncodedWalletRequestMatcher {
	domain: string
	path?: string
	method?: string
	purposes?: NonEmptyArray<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'
	policy?: CollectionPolicy
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Minimal glob: '*' matches any substring (including empty). Anchored to full string.
 */
function globToRegExp(glob: string): RegExp {
	const parts = glob.split('*').map(escapeRegExp)

	return new RegExp(`^${parts.join('.*')}$`)
}

/**
 * Domain selector semantics: match the domain AND any subdomain of it:
 *     matcher=infura.io matches infura.io and foo.infura.io
 * Matching is case-insensitive.
 */
function domainMatches(matcherDomain: string, requestDomain: string): boolean {
	const m = matcherDomain.trim().toLowerCase()
	const r = requestDomain.trim().toLowerCase()

	return r === m || r.endsWith(`.${m}`)
}

function optionalGlobMatches(pattern: string | null, value: string): boolean {
	if (pattern === null) {
		return true
	}

	return globToRegExp(pattern).test(value)
}

export interface SaveOptions {
	/** Verify existing file contents instead of saving. */
	verifyExisting: boolean

	/** Wallet ID; used to avoid importing wallet data in this file to avoid circular imports. */
	walletId: string

	/** Wallet variants; used to avoid importing wallet data in this file to avoid circular imports. */
	walletVariants: AtLeastOneTrueVariant
}

export class WalletRequestMatcher {
	private readonly domain: string
	private readonly path: string | null
	private readonly method: string | null
	public readonly purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' | null
	public readonly policy: CollectionPolicy | null

	constructor({
		domain,
		path,
		method,
		purposes,
		policy,
	}: {
		domain: string
		path: string | null
		method: string | null
		purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' | null
		policy: CollectionPolicy | null
	}) {
		this.domain = domain

		if (path !== null && (path.includes('?') || path.includes('#'))) {
			throw new Error(`invalid path: '${path}' (must only contain path components, no "?" or "#")`)
		}

		this.path = path
		this.method = method
		this.purposes = purposes
		this.policy = policy
	}

	public matches(request: WalletRequest): boolean {
		if (!domainMatches(this.domain, request.domain)) {
			return false
		}

		if (!optionalGlobMatches(this.path, request.path)) {
			return false
		}

		// If method selector is provided, require a JSON-RPC method match.
		if (this.method !== null) {
			if (request.jsonRpcMethods.length === 0) {
				return false
			}

			const re = globToRegExp(this.method)

			return request.jsonRpcMethods.some(m => re.test(m))
		}

		return true
	}

	public toJSON(): EncodedWalletRequestMatcher {
		return {
			domain: this.domain,
			...(this.purposes === null
				? {}
				: {
						purposes:
							this.purposes === 'NOT_WALLET_INITIATED'
								? 'NOT_WALLET_INITIATED'
								: dataCollectionPurpose.reorderNonEmpty(setItems(this.purposes)),
					}),
			...(this.path === null ? {} : { path: this.path }),
			...(this.method === null ? {} : { method: this.method }),
			...(this.policy === null ? {} : { policy: this.policy }),
		}
	}

	public toString(): string {
		return JSON.stringify(this.toJSON())
	}
}

export class WalletCaptureAnnotations {
	private readonly walletId: string
	private readonly path: string | null
	private matchers: WalletRequestMatcher[]

	public static fromFile(walletId: string, pathStr: string): WalletCaptureAnnotations {
		let data: EncodedWalletCaptureAnnotations = { matchers: [] }

		if (fs.existsSync(pathStr)) {
			const raw = fs.readFileSync(pathStr, 'utf8').trim()

			if (raw !== '') {
				const parsed: unknown = JSON.parse(raw)

				data = WalletCaptureAnnotations.parseEncoded(parsed, '$')
			}
		}

		return new WalletCaptureAnnotations(walletId, pathStr, data)
	}

	public static fromData(walletId: string, data: unknown): WalletCaptureAnnotations {
		const parsed = WalletCaptureAnnotations.parseEncoded(data, '$')

		return new WalletCaptureAnnotations(walletId, null, parsed)
	}

	private constructor(
		walletId: string,
		pathStr: string | null,
		data: EncodedWalletCaptureAnnotations,
	) {
		this.walletId = walletId
		this.path = pathStr
		this.matchers = data.matchers.map(m => {
			return new WalletRequestMatcher({
				domain: m.domain,
				path: m.path ?? null,
				method: m.method ?? null,
				purposes:
					m.purposes === undefined
						? null
						: m.purposes === 'NOT_WALLET_INITIATED'
							? 'NOT_WALLET_INITIATED'
							: nonEmptySetFromArray(m.purposes),
				policy: m.policy ?? null,
			})
		})
	}

	private static parseEncoded(v: unknown, at: string): EncodedWalletCaptureAnnotations {
		const root = expectRecord(v, at)
		const arr = expectArray(root.matchers === undefined ? [] : root.matchers, `${at}.matchers`)

		const matchers: EncodedWalletRequestMatcher[] = arr.map((v, i) => {
			const matcherAt = `${at}.matchers[${i}]`
			const obj = expectRecord(v, matcherAt)

			const domain = expectString(obj.domain, `${matcherAt}.domain`)
			const pathOpt = expectOptionalString(obj.path, `${matcherAt}.path`)
			const methodOpt = expectOptionalString(obj.method, `${matcherAt}.method`)

			const purposes = (():
				| NonEmptyArray<DataCollectionPurpose>
				| 'NOT_WALLET_INITIATED'
				| undefined => {
				if (obj.purposes === undefined) {
					return undefined
				}

				if (typeof obj.purposes === 'string') {
					if (obj.purposes !== 'NOT_WALLET_INITIATED') {
						throw new Error(`invalid purposes=${obj.purposes} at ${matcherAt}.purposes`)
					}

					return 'NOT_WALLET_INITIATED' as const
				}

				const purposesArray = expectArray(obj.purposes, `${matcherAt}.purposes`)

				if (!isNonEmptyArray(purposesArray)) {
					throw new Error(`Expected non-empty array at ${matcherAt}.purposes`)
				}

				return assertNonEmptyArray(
					purposesArray.map((p, j) =>
						dataCollectionPurpose.assert(expectString(p, `${matcherAt}.purposes[${j}]`)),
					),
				)
			})()

			const policyOpt = expectOptionalString(obj.policy, `${matcherAt}.policy`)

			return {
				domain,
				path: pathOpt,
				method: methodOpt,
				purposes,
				policy: policyOpt === undefined ? undefined : collectionPolicyEnum.assert(policyOpt),
			}
		})

		return { matchers }
	}

	private toJSON(): EncodedWalletCaptureAnnotations {
		return {
			matchers: this.matchers.map(m => m.toJSON()),
		}
	}

	public add(matcher: WalletRequestMatcher) {
		this.matchers.push(matcher)
	}

	public remove(matcher: WalletRequestMatcher) {
		const index = this.matchers.indexOf(matcher)

		if (index === -1) {
			throw new Error(`no such matcher: ${matcher.toString()}`)
		}

		this.matchers.splice(index, 1)
	}

	public matches(request: WalletRequest): WalletRequestMatcher | null {
		let found: WalletRequestMatcher | null = null

		for (const matcher of this.matchers) {
			if (matcher.matches(request)) {
				if (found !== null) {
					throw new Error(
						`Request ${request.toString()} matches multiple matchers: ${matcher.toString()} and ${found.toString()}`,
					)
				}

				found = matcher
			}
		}

		return found
	}

	public async save(opts: SaveOptions): Promise<string[]> {
		if (this.path === null) {
			throw new Error('WalletCaptureAnnotations built without a path; cannot save.')
		}

		const dir = path.dirname(this.path)

		await fs.promises.mkdir(dir, { recursive: true })

		const content = JSON.stringify(this.toJSON(), null, '\t') + '\n'

		// Check if content differs from what's on disk
		let needsWrite = true

		if (fs.existsSync(this.path)) {
			const existingContent = fs.readFileSync(this.path, 'utf8')

			if (existingContent === content) {
				needsWrite = false
			}
		}

		const changed: string[] = []

		if (opts.verifyExisting) {
			if (needsWrite) {
				throw new Error(`File not in sync: ${this.path}`)
			}
		} else if (needsWrite) {
			const tmp = `${this.path}.tmp`

			await fs.promises.writeFile(tmp, content, 'utf8')
			await fs.promises.rename(tmp, this.path)
			changed.push(this.path)
		}

		const dataCollectionFilesChanged = await this.generateDataCollectionFile(dir, opts)

		return changed.concat(...dataCollectionFilesChanged)
	}

	/**
	 * Generates the wallet-data-collection.ts TypeScript file in the given directory.
	 * This file imports the annotations and all variant capture files, then exports
	 * the result of autoGenerateWalletDataCollection().
	 */
	async generateDataCollectionFile(dir: string, opts: SaveOptions): Promise<string[]> {
		if (this.path === null) {
			throw new Error('WalletCaptureAnnotations built without a path; cannot save.')
		}

		const basename = path.basename(this.path)

		// Scan directory for variant capture files: {walletId}.{variant}.capture.json
		let variantImports: {
			variant: Variant
			importName: string | null
			filename: string | null
		}[] = Object.keys(opts.walletVariants).map(variant => ({
			variant,
			importName: null,
			filename: null,
		}))

		for (const filename of fs.readdirSync(dir)) {
			const captureMatch = filename.match(
				new RegExp(`^${escapeRegExp(this.walletId)}\\.(.*?)\\.capture\\.json$`),
			)

			if (captureMatch !== null) {
				const variantName = captureMatch[1]
				const variantKey = variantName.toUpperCase()

				// Validate that it's a known variant
				if (!variantEnum.is(variantKey)) {
					throw new Error(`Unknown variant "${variantName}" in file ${filename}`)
				}

				variantImports = variantImports.map(vi => {
					if (vi.variant !== variantKey) {
						return vi
					}

					return {
						variant: variantKey,
						importName: `${variantName}Data`,
						filename: `./${filename}`,
					}
				})
			}
		}
		variantImports.sort((a, b) => a.variant.localeCompare(b.variant))

		// Build the TypeScript file content
		const lines: string[] = [
			"import { autoGenerateWalletDataCollection } from '@/tools/wallet-data-collection/convert-to-feature-data'",
			'',
			`import annotations from './${basename}'`,
		]

		for (const vi of variantImports) {
			if (vi.filename === null) {
				continue
			}

			lines.push(`import ${vi.importName} from '${vi.filename}'`)
		}

		lines.push('')
		lines.push('const walletDataCollection = autoGenerateWalletDataCollection({')
		lines.push('\tannotations,')
		lines.push('\tdata: {')

		for (const vi of variantImports) {
			lines.push(`\t\t${vi.variant}: ${vi.importName === null ? 'null' : vi.importName},`)
		}

		lines.push('\t},')
		lines.push(`\twalletId: '${this.walletId}',`)
		lines.push('})')
		lines.push('')
		lines.push('export default walletDataCollection')
		lines.push('')

		const tsContent = lines.join('\n')
		const tsPath = path.join(dir, 'wallet-data-collection.ts')

		// Check if content differs from what's on disk
		let needsWriteTs = true
		const changed: string[] = []

		if (fs.existsSync(tsPath)) {
			const existingContent = fs.readFileSync(tsPath, 'utf8')

			if (existingContent === tsContent) {
				needsWriteTs = false
			}
		}

		if (opts.verifyExisting) {
			if (needsWriteTs) {
				throw new Error(`File not in sync: ${tsPath}`)
			}
		} else if (needsWriteTs) {
			const tsTmp = `${tsPath}.tmp`

			await fs.promises.writeFile(tsTmp, tsContent, 'utf8')
			await fs.promises.rename(tsTmp, tsPath)
			changed.push(tsPath)
		}

		return changed
	}
}
