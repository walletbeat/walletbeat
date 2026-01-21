import fs from 'node:fs'
import path from 'node:path'

import {
	type DataCollectionPurpose,
	dataCollectionPurpose,
} from '@/schema/features/privacy/data-collection'
import {
	assertNonEmptyArray,
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
	purposes: NonEmptyArray<DataCollectionPurpose>
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
 * Domain selector semantics:
 * - If matcher domain contains '*', treat it as a glob against the full hostname.
 * - Otherwise match the domain AND any subdomain of it:
 *     matcher=infura.io matches infura.io and foo.infura.io
 * Matching is case-insensitive.
 */
function domainMatches(matcherDomain: string, requestDomain: string): boolean {
	const m = matcherDomain.trim().toLowerCase()
	const r = requestDomain.trim().toLowerCase()

	if (m.includes('*')) {
		return globToRegExp(m).test(r)
	}

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
	private readonly _purposes: NonEmptySet<DataCollectionPurpose>

	constructor({
		domain,
		path,
		method,
		purposes,
	}: {
		domain: string
		path: string | null
		method: string | null
		purposes: NonEmptySet<DataCollectionPurpose>
	}) {
		this.domain = domain
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

	public get purposes(): NonEmptySet<DataCollectionPurpose> {
		return this.purposes
	}

	public toJSON(): EncodedWalletRequestMatcher {
		return {
			domain: this.domain,
			purposes: dataCollectionPurpose.reorderNonEmpty(setItems(this._purposes)),
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

		// Backward/forward compatibility: accept missing field as empty list.
		const rawMatchers = root.requestPurposes === undefined ? [] : root.requestPurposes
		const arr = expectArray(rawMatchers, '$.requestPurposes')

		this.matchers = arr.map((v, i) => {
			const at = `$.requestPurposes[${i}]`
			const obj = expectRecord(v, at)

			const domain = expectString(obj.domain, `${at}.domain`)
			const pathOpt = expectOptionalString(obj.path, `${at}.path`)
			const methodOpt = expectOptionalString(obj.method, `${at}.method`)

			const purposesRaw = expectArray(obj.purposes, `${at}.purposes`)

			if (purposesRaw.length === 0) {
				throw new Error(`Expected non-empty array at ${at}.purposes`)
			}

			const purposes = nonEmptySetFromArray(
				assertNonEmptyArray(
					purposesRaw.map((p, j) =>
						dataCollectionPurpose.assert(expectString(p, `${at}.purposes[${j}]`)),
					),
				),
			)

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
