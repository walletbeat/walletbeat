import fs from 'node:fs'
import path from 'node:path'

import {
	CollectionPolicy,
	collectionPolicyEnum,
	type DataCollectionPurpose,
	dataCollectionPurpose,
} from '@/schema/features/privacy/data-collection'
import { type AtLeastOneTrueVariant } from '@/schema/variants'
import { isInVocabulary } from '@/tests/utils/grammar'
import { getErrorMessage } from '@/types/errors'
import { assertErc55Address, type Erc55Address } from '@/types/utils/ethereum-address'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	type NonEmptySet,
	nonEmptySetFromArray,
	setItems,
} from '@/types/utils/non-empty'
import { escapeRegExp } from '@/utils/codebase'
import {
	expectArray,
	expectOptionalString,
	expectRecord,
	expectString,
	isSameJson,
} from '@/utils/json'

import type { WalletRequest } from './wallet-capture-file'

export interface EncodedWalletCaptureAnnotations {
	/** Only allowed in the global annotations file. */
	globalContractAddresses?: EncodedGlobalContractAddress[]
	matchers: EncodedWalletRequestMatcher[]
	benignStrings: string[]
}

/**
 * A well-known contract address (e.g. a popular token) that shows up in
 * wallet traffic regardless of who the user is.
 */
export interface EncodedGlobalContractAddress {
	/** Human-readable label, e.g. "USDC (Ethereum)". */
	name: string
	address: Erc55Address
}

export interface EncodedWalletRequestMatcher {
	domain: string
	path?: string
	method?: string
	refererDomain?: string
	purposes?: NonEmptyArray<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'
	policy?: CollectionPolicy
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
export function domainMatches(matcherDomain: string, requestDomain: string): boolean {
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

const GLOBAL_BENIGN_REGULAR_EXPRESSIONS: RegExp[] = [
	/^chrome-extension:\/\/\w+$/,
	// ISO-8601 timestamps (e.g. event/request timestamps) are not user-identifying on their own.
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
	// Strings of one or two word characters (letters, digits, underscore)
	/^\w{1,2}$/,
]

/**
 * A full Ethereum address (with or without "0x"), or a UI-truncated form of one
 * such as "0xA0b8...eB48" or "0xEeeeeEeeeEeEeeE...".
 * Truncated forms must keep at least 4 hex characters after "0x".
 */
const FULL_ADDRESS_REGEXP = /^(?:0x)?([0-9a-f]{40})$/i
const TRUNCATED_ADDRESS_REGEXP = /^0x([0-9a-f]{4,39})(?:\.\.\.|…)([0-9a-f]{0,36})$/i

/**
 * @returns Whether `str` refers to `address`, either in full (in any letter case)
 *     or in truncated form.
 */
export function refersToAddress(str: string, address: Erc55Address): boolean {
	const addressHex = address.slice(2).toLowerCase()
	const full = FULL_ADDRESS_REGEXP.exec(str)

	if (full !== null) {
		return full[1].toLowerCase() === addressHex
	}

	const truncated = TRUNCATED_ADDRESS_REGEXP.exec(str)

	if (truncated === null) {
		return false
	}

	const prefix = truncated[1].toLowerCase()
	const suffix = truncated[2].toLowerCase()

	return (
		prefix.length + suffix.length < addressHex.length &&
		addressHex.startsWith(prefix) &&
		addressHex.endsWith(suffix)
	)
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
	private readonly refererDomain: string | null
	public readonly isGlobal: boolean
	public readonly purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' | null
	public readonly policy: CollectionPolicy | null

	constructor(
		{
			domain,
			path,
			method,
			refererDomain,
			purposes,
			policy,
		}: {
			domain: string
			path: string | null
			method: string | null
			refererDomain: string | null
			purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' | null
			policy: CollectionPolicy | null
		},
		isGlobal: boolean,
	) {
		this.isGlobal = isGlobal

		if (domain.trim() === '') {
			throw new Error('domain cannot be empty')
		}

		if (purposes === 'NOT_WALLET_INITIATED' && policy !== null) {
			throw new Error(
				`cannot set any collection policy (got ${policy}) for NOT_WALLET_INITIATED requests`,
			)
		}

		this.domain = domain

		if (path !== null && (path.includes('?') || path.includes('#'))) {
			throw new Error(`invalid path: '${path}' (must only contain path components, no "?" or "#")`)
		}

		this.path = path
		this.method = method
		this.refererDomain = refererDomain
		this.purposes = purposes
		this.policy = policy
	}

	public matches(request: WalletRequest): boolean {
		if (!domainMatches(this.domain, request.domain)) {
			return false
		}

		// If a referer domain selector is provided, require a referer header domain match.
		if (this.refererDomain !== null) {
			const requestRefererDomain = request.refererDomain()

			if (requestRefererDomain === null) {
				return false
			}

			if (!domainMatches(this.refererDomain, requestRefererDomain)) {
				return false
			}
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
			...(this.refererDomain === null ? {} : { refererDomain: this.refererDomain }),
			...(this.policy === null ? {} : { policy: this.policy }),
		}
	}

	public toString(): string {
		return JSON.stringify(this.toJSON())
	}
}

export class WalletCaptureAnnotations {
	private readonly path: string | null
	private readonly globalPath: string | null
	private matchers: WalletRequestMatcher[]
	private readonly globalContractAddresses: EncodedGlobalContractAddress[]
	private globalBenignStrings: Set<string>
	private benignStrings: Set<string>

	public static fromFile(pathStr: string, globalPath: string): WalletCaptureAnnotations {
		let data: EncodedWalletCaptureAnnotations = {
			matchers: [],
			benignStrings: [],
		}

		if (fs.existsSync(pathStr)) {
			const raw = fs.readFileSync(pathStr, 'utf8').trim()

			if (raw !== '') {
				let parsed: unknown

				try {
					parsed = JSON.parse(raw) as unknown
				} catch (e) {
					throw new Error(`Invalid JSON in annotations file ${pathStr}: ${getErrorMessage(e)}`, {
						cause: e,
					})
				}

				data = WalletCaptureAnnotations.parseEncoded(parsed, '$', false)
			}
		}

		const globalRaw = fs.readFileSync(globalPath, 'utf8').trim()
		let global: EncodedWalletCaptureAnnotations

		try {
			global = WalletCaptureAnnotations.parseEncoded(
				JSON.parse(globalRaw) as unknown,
				'global$',
				true,
			)
		} catch (e) {
			throw new Error(`Invalid JSON in annotations file ${globalPath}: ${getErrorMessage(e)}`, {
				cause: e,
			})
		}

		return new WalletCaptureAnnotations(pathStr, globalPath, data, global)
	}

	public static fromData(data: unknown, globalData: unknown): WalletCaptureAnnotations {
		const parsed = WalletCaptureAnnotations.parseEncoded(data, '$', false)
		const global = WalletCaptureAnnotations.parseEncoded(globalData, 'global$', true)

		return new WalletCaptureAnnotations(null, null, parsed, global)
	}

	private static parseEncoded(
		v: unknown,
		at: string,
		isGlobal: boolean,
	): EncodedWalletCaptureAnnotations {
		const root = expectRecord(v, at)

		if (!isGlobal && root.globalContractAddresses !== undefined) {
			throw new Error(
				`${at}.globalContractAddresses is only allowed in the global annotations file`,
			)
		}

		const seenContractAddresses = new Set<Erc55Address>()
		const globalContractAddresses = expectArray(
			root.globalContractAddresses === undefined ? [] : root.globalContractAddresses,
			`${at}.globalContractAddresses`,
		).map((v, i): EncodedGlobalContractAddress => {
			const contractAt = `${at}.globalContractAddresses[${i}]`
			const obj = expectRecord(v, contractAt)
			const name = expectString(obj.name, `${contractAt}.name`)

			if (name.trim() === '') {
				throw new Error(`${contractAt}.name cannot be empty`)
			}

			const address = assertErc55Address(expectString(obj.address, `${contractAt}.address`))

			if (seenContractAddresses.has(address)) {
				throw new Error(`duplicate contract address ${address} at ${contractAt}.address`)
			}

			seenContractAddresses.add(address)

			return { name, address }
		})
		const matchersArr = expectArray(
			root.matchers === undefined ? [] : root.matchers,
			`${at}.matchers`,
		)

		const matchers: EncodedWalletRequestMatcher[] = matchersArr.map((v, i) => {
			const matcherAt = `${at}.matchers[${i}]`
			const obj = expectRecord(v, matcherAt)

			const domain = expectString(obj.domain, `${matcherAt}.domain`)
			const pathOpt = expectOptionalString(obj.path, `${matcherAt}.path`)
			const methodOpt = expectOptionalString(obj.method, `${matcherAt}.method`)
			const refererDomainOpt = expectOptionalString(obj.refererDomain, `${matcherAt}.refererDomain`)

			const purposes = (():
				NonEmptyArray<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' | undefined => {
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
				refererDomain: refererDomainOpt,
				purposes,
				policy: policyOpt === undefined ? undefined : collectionPolicyEnum.assert(policyOpt),
			}
		})
		const benignStringsArr = expectArray(
			root.benignStrings === undefined ? [] : root.benignStrings,
			`${at}.benignStrings`,
		)
		const benignStrings = benignStringsArr.map(v => {
			if (typeof v !== 'string') {
				throw new Error(`not a string: ${String(v)}`)
			}

			return v
		})

		return {
			globalContractAddresses,
			matchers,
			benignStrings,
		}
	}

	private constructor(
		pathStr: string | null,
		globalPath: string | null,
		data: EncodedWalletCaptureAnnotations,
		global: EncodedWalletCaptureAnnotations,
	) {
		const toMatcher = (m: EncodedWalletRequestMatcher, isGlobal: boolean): WalletRequestMatcher => {
			return new WalletRequestMatcher(
				{
					domain: m.domain,
					path: m.path ?? null,
					method: m.method ?? null,
					refererDomain: m.refererDomain ?? null,
					purposes:
						m.purposes === undefined
							? null
							: m.purposes === 'NOT_WALLET_INITIATED'
								? 'NOT_WALLET_INITIATED'
								: nonEmptySetFromArray(m.purposes),
					policy: m.policy ?? null,
				},
				isGlobal,
			)
		}

		this.globalPath = globalPath
		this.path = pathStr
		this.matchers = global.matchers
			.map(m => toMatcher(m, true))
			.concat(data.matchers.map(m => toMatcher(m, false)))
		this.globalContractAddresses = global.globalContractAddresses ?? []
		this.globalBenignStrings = new Set()
		this.benignStrings = new Set()

		for (const benign of global.benignStrings) {
			this.globalBenignStrings.add(benign)
		}

		for (const benign of data.benignStrings) {
			this.benignStrings.add(benign)
		}
	}

	private toJSON(global: boolean): EncodedWalletCaptureAnnotations {
		return {
			...(global && this.globalContractAddresses.length > 0
				? { globalContractAddresses: this.globalContractAddresses }
				: {}),
			matchers: this.matchers.filter(m => m.isGlobal === global).map(m => m.toJSON()),
			benignStrings: Array.from(global ? this.globalBenignStrings : this.benignStrings).toSorted(),
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

	public addBenignString(str: string, global: boolean) {
		if (this.isBenign(str)) {
			throw new Error(`string '${str}' is already considered benign`)
		}

		;(global ? this.globalBenignStrings : this.benignStrings).add(str)
	}

	/**
	 * @returns The well-known contract address that `str` refers to (in full or
	 *     truncated form), or null if it does not refer to any of them.
	 */
	public globalContractAddressOf(str: string): Erc55Address | null {
		for (const contract of this.globalContractAddresses) {
			if (refersToAddress(str, contract.address)) {
				return contract.address
			}
		}

		return null
	}

	/**
	 * @param userAssetAddresses Token addresses that are user data for this
	 *     capture (e.g. the tokens swapped during it). These are not considered
	 *     benign even if they are well-known contract addresses.
	 */
	public isBenign(str: string, userAssetAddresses: readonly Erc55Address[] = []): boolean {
		for (const benignRegexp of GLOBAL_BENIGN_REGULAR_EXPRESSIONS) {
			if (benignRegexp.test(str)) {
				return true
			}
		}

		if (isInVocabulary(str)) {
			return true
		}

		if (this.globalBenignStrings.has(str) || this.benignStrings.has(str)) {
			return true
		}

		const contractAddress = this.globalContractAddressOf(str)

		return (
			contractAddress !== null &&
			!userAssetAddresses.some(a => a.toLowerCase() === contractAddress.toLowerCase())
		)
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
		if (this.path === null || this.globalPath === null) {
			throw new Error('WalletCaptureAnnotations built without a path; cannot save.')
		}

		const dir = path.dirname(this.path)

		await fs.promises.mkdir(dir, { recursive: true })

		const content = JSON.stringify(this.toJSON(false), null, '\t') + '\n'

		// Check if content differs from what's on disk
		let needsWrite = true

		if (fs.existsSync(this.path)) {
			const existingContent = fs.readFileSync(this.path, 'utf8')

			if (isSameJson(existingContent, content)) {
				needsWrite = false
			}
		}

		const globalContent = JSON.stringify(this.toJSON(true), null, '\t') + '\n'
		const existingGlobalContent = fs.readFileSync(this.globalPath, 'utf8')
		const globalNeedsWrite = !isSameJson(existingGlobalContent, globalContent)
		const changed: string[] = []

		if (opts.verifyExisting) {
			if (needsWrite) {
				throw new Error(`File not in sync: ${this.path}`)
			}

			if (globalNeedsWrite) {
				throw new Error(`File not in sync: ${this.globalPath}`)
			}
		} else {
			if (needsWrite) {
				const tmp = `${this.path}.tmp`

				await fs.promises.writeFile(tmp, content, 'utf8')
				await fs.promises.rename(tmp, this.path)
				changed.push(this.path)
			}

			if (globalNeedsWrite) {
				const tmp = `${this.globalPath}.tmp`

				await fs.promises.writeFile(tmp, globalContent, 'utf8')
				await fs.promises.rename(tmp, this.globalPath)
				changed.push(this.globalPath)
			}
		}

		return changed
	}
}
