import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { request } from 'https'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { hasRefs, toFullyQualified, type WithRef } from '@/schema/reference'
import { getUrl, type Url } from '@/schema/url'
import { getRepositoryRoot } from '@/tests/utils/codebase'
import { type KnownValidUrl, knownValidUrls, shouldSkipUrl } from '@/tests/utils/known-urls'
import { findExternalUrlsInDist } from '@/tests/utils/scan-html-urls'
import { today } from '@/types/date'

const newValidUrls: KnownValidUrl[] = []

const verifiedUrls: KnownValidUrl[] = []

/** Core validation logic, extracted so it can be shared by `checkValidUrl` (wallet-data `Url`s) and the built-HTML scan below (plain hrefs). */
async function checkValidHref(href: string): Promise<void> {
	if (shouldSkipUrl(href)) {
		return
	}

	// Repository-relative references (e.g. screenshots) and other non-HTTPS URLs
	// cannot be fetched over HTTPS; they are validated by other means.
	if (!href.startsWith('https://')) {
		return
	}

	const h = createHash('sha1')

	h.update(href)
	const digest = h.digest('hex')
	const existing = knownValidUrls.find(knownValidUrl => knownValidUrl.urlHash === digest)

	if (existing !== undefined) {
		expect(existing).toBeDefined()
		verifiedUrls.push(existing)

		return new Promise(resolve => {
			resolve()
		})
	}

	if (newValidUrls.some(newValidUrl => href === newValidUrl.url)) {
		expect(true).toBeDefined()

		return new Promise(resolve => {
			resolve()
		})
	}

	const isValidStatusCode = (statusCode: undefined | number): boolean => {
		if (statusCode === undefined) {
			return false
		}

		return statusCode >= 200 && statusCode <= 299
	}

	// The promise must always resolve and never throw: an exception inside a
	// socket event handler would prevent `resolve()` from running, leaving the
	// test hanging until vitest's testTimeout (60s) kills it. Assertions happen
	// after the outcome is known, below.
	const failure = await new Promise<string | null>(resolve => {
		let hasData = false
		const req = request(href, res => {
			res.on('data', () => {
				hasData = true
			})
			res.on('error', err => {
				resolve(`Request to ${href} failed; error: ${err}`)
			})
			res.on('end', () => {
				if (isValidStatusCode(res.statusCode) && hasData) {
					resolve(null)
				} else {
					resolve(
						`Request to ${href} failed (HTTP status code: ${res.statusCode ?? 'unknown'})${hasData ? '' : ' (received 0 bytes)'}`,
					)
				}
			})
		})

		// Without an explicit socket timeout, a host that accepts the connection but
		// never responds would hang until vitest's testTimeout.
		// Fail fast instead, like `pnpm validate-urls` does.
		req.setTimeout(15000)
		req.on('timeout', () => {
			req.destroy()
			resolve(`Request to ${href} timed out.`)
		})
		req.on('error', err => {
			resolve(`Request to ${href} failed; error: ${err}`)
		})
		req.end()
	})

	expect(failure).toSatisfy(f => f === null, failure ?? '')

	if (failure === null) {
		newValidUrls.push({ url: href, urlHash: digest, retrieved: today() })
	}
}

/** Thin wrapper over `checkValidHref` for wallet-data references, which carry a `Url` rather than a plain string. */
async function checkValidUrl(url: Url): Promise<void> {
	await checkValidHref(getUrl(url))
}

/**
 * `pnpm validate-urls` populates known-urls.json from both wallet-data
 * references and every external link found in the built site's HTML (e.g.
 * hardcoded links in markdown attribute descriptions or components). This
 * test file must scan the same built HTML, or those entries would always
 * appear as "extraneous" below, since nothing else in this file would ever
 * visit them.
 */
function getDistDir(): string {
	const distDir = process.env.DIST_DIR ?? path.join(getRepositoryRoot(), 'dist')

	if (!existsSync(distDir)) {
		execSync('pnpm run build', { cwd: getRepositoryRoot(), stdio: 'inherit' })
	}

	return distDir
}

describe('reference URLs', () => {
	for (const wallet of Object.values(allWallets)) {
		describe(`wallet ${wallet.metadata.displayName}`, () => {
			it('has valid websites', async () => {
				for (const website of wallet.metadata.urls?.websites ?? []) {
					await checkValidUrl(website)
				}
			})
			it('has valid docs', async () => {
				for (const doc of wallet.metadata.urls?.docs ?? []) {
					await checkValidUrl(doc)
				}
			})
			it('has valid repositories', async () => {
				for (const repository of wallet.metadata.urls?.repositories ?? []) {
					await checkValidUrl(repository)
				}
			})
			it('has valid extensions', async () => {
				for (const extension of wallet.metadata.urls?.extensions ?? []) {
					await checkValidUrl(extension)
				}
			})
			it('has valid androidManifestXml', async () => {
				if (wallet.metadata.urls?.androidManifestXml !== undefined) {
					await checkValidUrl(wallet.metadata.urls.androidManifestXml)
				}
			})
			it('has valid iosInfoPlist', async () => {
				if (wallet.metadata.urls?.iosInfoPlist !== undefined) {
					await checkValidUrl(wallet.metadata.urls.iosInfoPlist)
				}
			})
			it('has valid socials', async () => {
				for (const social of Object.values(wallet.metadata.urls?.socials ?? {})) {
					if (social === undefined) {
						continue
					}

					await checkValidUrl(social)
				}
			})
			it('has valid others', async () => {
				for (const other of wallet.metadata.urls?.others ?? []) {
					await checkValidUrl(other)
				}
			})
			type FieldWithRef = {
				path: string[]
				withRef: WithRef<unknown>
			}
			const refFields: FieldWithRef[] = []
			const findRefs = (path: string[], x: unknown) => {
				if (x === undefined || x === null) {
					return
				}

				if (Array.isArray(x)) {
					x.map((item, index) => findRefs(path.concat([`[${index.toString()}]`]), item))

					return
				}

				if (typeof x !== 'object') {
					return
				}

				for (const [key, val] of Object.entries(x)) {
					findRefs(path.length === 0 ? [key] : path.concat([`.${key}`]), val)
				}

				if (hasRefs(x) && toFullyQualified(x.ref).length > 0) {
					refFields.push({
						path,
						withRef: x,
					})
				}
			}

			findRefs([], wallet)

			for (const fieldWithRef of refFields) {
				describe(fieldWithRef.path.join(''), () => {
					for (const qualRef of toFullyQualified(fieldWithRef.withRef.ref)) {
						for (const qualRefUrl of qualRef.urls) {
							describe(qualRefUrl.url, () => {
								it('is valid URL', async () => {
									await checkValidUrl(qualRefUrl)
								})
							})
						}
					}
				})
			}
		})
	}
})

describe('built site external URLs', () => {
	const distDir = getDistDir()

	for (const [href, firstFile] of findExternalUrlsInDist(distDir)) {
		describe(href, () => {
			it(`is valid URL (found in ${firstFile})`, async () => {
				await checkValidHref(href)
			})
		})
	}
})

describe('already-known valid URLs set', () => {
	it('is exhaustive', () => {
		expect(null).toSatisfy(
			() => newValidUrls.length === 0,
			(newValidUrls.length === 1
				? 'A new valid URL was detected, and needs to be added to the known-valid URL list to avoid re-fetching it on every run.'
				: 'New valid URLs were detected, and need to be added to the known-valid URL list to avoid re-fetching them on every run.') +
				'\n\nRun `pnpm validate-urls` to add them automatically, or add the following to tests/utils/known-urls.json:\n\n' +
				newValidUrls.map(newValidUrl => JSON.stringify(newValidUrl, null, '\t')).join('\n'),
		)
	})
	it('has no extraneous entries', () => {
		expect(null).toSatisfy(
			() =>
				knownValidUrls.every(knownValidUrl =>
					verifiedUrls.some(verifiedUrl => knownValidUrl.urlHash === verifiedUrl.urlHash),
				),
			'URLs were removed; run `pnpm validate-urls` or remove them from tests/utils/known-urls.json as well:\n\n' +
				knownValidUrls
					.filter(knownValidUrl =>
						verifiedUrls.every(verifiedUrl => knownValidUrl.urlHash !== verifiedUrl.urlHash),
					)
					.map(verifiedUrl => `- ${verifiedUrl.url}`)
					.join('\n'),
		)
	})
	it('has no duplicate entries', () => {
		for (const knownValidUrl1 of knownValidUrls) {
			expect(null).toSatisfy(
				() =>
					knownValidUrls.filter(
						knownValidUrl2 =>
							knownValidUrl1.url === knownValidUrl2.url ||
							knownValidUrl1.urlHash === knownValidUrl2.urlHash,
					).length === 1,
				`URL '${knownValidUrl1.url}' is duplicated.`,
			)
		}
	})
	describe('has valid hashes', () => {
		for (const knownValidUrl of knownValidUrls) {
			describe(knownValidUrl.url, () => {
				it('has valid hash', () => {
					const h = createHash('sha1')

					h.update(knownValidUrl.url)
					const digest = h.digest('hex')

					expect(knownValidUrl.urlHash).toEqual(digest)
				})
			})
		}
	})
})
