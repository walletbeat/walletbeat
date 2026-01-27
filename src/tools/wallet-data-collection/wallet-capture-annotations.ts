import fs from 'node:fs'
import path from 'node:path'

import {
	type DataCollectionPurpose,
	dataCollectionPurpose,
} from '@/schema/features/privacy/data-collection'
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
	purposes: NonEmptyArray<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'
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

export class WalletRequestMatcher {
	private readonly domain: string
	private readonly path: string | null
	private readonly method: string | null
	private readonly _purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'

	constructor({
		domain,
		path,
		method,
		purposes,
	}: {
		domain: string
		path: string | null
		method: string | null
		purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'
	}) {
		this.domain = domain

		if (path !== null && (path.includes('?') || path.includes('#'))) {
			throw new Error(`invalid path: '${path}' (must only contain path components, no "?" or "#")`)
		}

		this.path = path
		this.method = method
		this._purposes = purposes
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

	public get purposes(): NonEmptySet<DataCollectionPurpose> | null {
		return this._purposes === 'NOT_WALLET_INITIATED' ? null : this._purposes
	}

	public toJSON(): EncodedWalletRequestMatcher {
		return {
			domain: this.domain,
			purposes:
				this._purposes === 'NOT_WALLET_INITIATED'
					? 'NOT_WALLET_INITIATED'
					: dataCollectionPurpose.reorderNonEmpty(setItems(this._purposes)),
			...(this.path === null ? {} : { path: this.path }),
			...(this.method === null ? {} : { method: this.method }),
		}
	}

	public toString(): string {
		return JSON.stringify(this.toJSON())
	}
}

export class WalletCaptureAnnotations {
	private readonly path: string
	private matchers: WalletRequestMatcher[]

	constructor(pathStr: string) {
		this.path = pathStr
		this.matchers = []

		if (!fs.existsSync(this.path)) {
			return
		}

		const raw = fs.readFileSync(this.path, 'utf8').trim()

		if (raw === '') {
			return
		}

		const parsed: unknown = JSON.parse(raw)
		const root = expectRecord(parsed, '$')
		const arr = expectArray(root.matchers === undefined ? [] : root.matchers, '$.matchers')

		this.matchers = arr.map((v, i) => {
			const at = `$.matchers[${i}]`
			const obj = expectRecord(v, at)

			const domain = expectString(obj.domain, `${at}.domain`)
			const pathOpt = expectOptionalString(obj.path, `${at}.path`)
			const methodOpt = expectOptionalString(obj.method, `${at}.method`)

			const purposes = ((): NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' => {
				if (obj.purposes === undefined) {
					throw new Error(`no 'purposes' at ${at}.purposes`)
				}

				if (typeof obj.purposes === 'string') {
					if (obj.purposes !== 'NOT_WALLET_INITIATED') {
						throw new Error(`invalid purposes=${obj.purposes} at ${at}.purposes`)
					}

					return 'NOT_WALLET_INITIATED'
				}

				const purposesArray = expectArray(obj.purposes, `${at}.purposes`)

				if (!isNonEmptyArray(purposesArray)) {
					throw new Error(`Expected non-empty array at ${at}.purposes`)
				}

				return nonEmptySetFromArray(
					assertNonEmptyArray(
						purposesArray.map((p, j) =>
							dataCollectionPurpose.assert(expectString(p, `${at}.purposes[${j}]`)),
						),
					),
				)
			})()

			return new WalletRequestMatcher({
				domain,
				path: pathOpt ?? null,
				method: methodOpt ?? null,
				purposes,
			})
		})
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

	public async save(): Promise<void> {
		const dir = path.dirname(this.path)

		await fs.promises.mkdir(dir, { recursive: true })

		const tmp = `${this.path}.tmp`

		await fs.promises.writeFile(tmp, JSON.stringify(this.toJSON(), null, 2) + '\n', 'utf8')
		await fs.promises.rename(tmp, this.path)
	}
}
