import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { writeFile } from 'fs/promises'
import { request } from 'https'
import pLimit from 'p-limit'
import path from 'path'

import { allWallets } from '@/data/wallets'
import { hasRefs, toFullyQualified } from '@/schema/reference'
import { getUrl, labeledUrl, type Url } from '@/schema/url'
import { getRepositoryRoot } from '@/tests/utils/codebase'
import { type KnownValidUrl, knownValidUrls, shouldSkipUrl } from '@/tests/utils/known-urls'
import { findExternalUrlsInDist } from '@/tests/utils/scan-html-urls'
import { today } from '@/types/date'

/**
 * Validates all reference URLs found in wallet data, plus every external URL
 * linked from the built site's HTML (hardcoded links in components,
 * markdown content, etc. — the same set that the post-build external URL
 * check enforces), and updates the known-valid URL list in
 * tests/utils/known-urls.json:
 *
 * - URLs already in the list are not re-fetched.
 * - New URLs are fetched once (plain node.js request, no browser spoofing);
 *   successfully-retrieved ones are appended to the list.
 * - Entries whose URL is no longer referenced anywhere are removed.
 *
 * URLs that fail to fetch are reported for manual verification: many websites
 * block automated requests (Cloudflare challenges, 403s), which does not mean
 * the link is dead. Open such URLs in a browser and, if they load correctly,
 * add the printed entry to the list by hand.
 */

const REPO_ROOT = getRepositoryRoot()
const KNOWN_URLS_FILE = path.join(REPO_ROOT, 'tests', 'utils', 'known-urls.json')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const FETCH_TIMEOUT_MS = 15000
const FETCH_CONCURRENCY = 4

function sha1(value: string): string {
	const h = createHash('sha1')

	h.update(value)

	return h.digest('hex')
}

/** Recursively collect all reference URLs attached to `x`, mirroring the URL check test. */
function findRefUrls(x: unknown, urls: Url[]): void {
	if (x === undefined || x === null) {
		return
	}

	if (Array.isArray(x)) {
		for (const item of x) {
			findRefUrls(item, urls)
		}

		return
	}

	if (typeof x !== 'object') {
		return
	}

	for (const val of Object.values(x)) {
		findRefUrls(val, urls)
	}

	if (hasRefs(x)) {
		for (const qualRef of toFullyQualified(x.ref)) {
			for (const qualRefUrl of qualRef.urls) {
				urls.push(qualRefUrl)
			}
		}
	}
}

/** Collect every URL the URL check test would check, across all wallets. */
function collectUrls(): Url[] {
	const urls: Url[] = []

	for (const wallet of Object.values(allWallets)) {
		urls.push(...(wallet.metadata.urls?.websites ?? []))
		urls.push(...(wallet.metadata.urls?.docs ?? []))
		urls.push(...(wallet.metadata.urls?.repositories ?? []))
		urls.push(...(wallet.metadata.urls?.extensions ?? []))

		if (wallet.metadata.urls?.androidManifestXml !== undefined) {
			urls.push(wallet.metadata.urls.androidManifestXml)
		}

		if (wallet.metadata.urls?.iosInfoPlist !== undefined) {
			urls.push(wallet.metadata.urls.iosInfoPlist)
		}

		for (const social of Object.values(wallet.metadata.urls?.socials ?? {})) {
			if (social !== undefined) {
				urls.push(social)
			}
		}

		urls.push(...(wallet.metadata.urls?.others ?? []))
		findRefUrls(wallet, urls)
	}

	return urls
}

interface FetchOutcome {
	ok: boolean
	detail: string
}

/**
 * Fetch a URL with the same semantics as the URL check test:
 * a plain HTTPS request with default headers, considered valid on a 2xx
 * response carrying at least one byte of data. Redirects are not followed.
 */
async function fetchUrl(href: string): Promise<FetchOutcome> {
	return new Promise(resolve => {
		let hasData = false

		try {
			const req = request(href, res => {
				res.on('data', () => {
					hasData = true
				})
				res.on('error', err => {
					resolve({ ok: false, detail: `response error: ${err.message}` })
				})
				res.on('end', () => {
					const statusCode = res.statusCode ?? 0
					const redirect =
						statusCode >= 300 && statusCode <= 399 && res.headers.location !== undefined
							? ` redirecting to ${res.headers.location}`
							: ''

					if (statusCode >= 200 && statusCode <= 299 && hasData) {
						resolve({ ok: true, detail: `HTTP ${statusCode.toString()}` })
					} else {
						resolve({
							ok: false,
							detail: `HTTP ${statusCode === 0 ? 'unknown' : statusCode.toString()}${redirect}${hasData ? '' : ' (received 0 bytes)'}`,
						})
					}
				})
			})

			req.setTimeout(FETCH_TIMEOUT_MS, () => {
				req.destroy(new Error(`timed out after ${(FETCH_TIMEOUT_MS / 1000).toString()}s`))
			})
			req.on('error', err => {
				resolve({ ok: false, detail: err.message })
			})
			req.end()
		} catch (err) {
			resolve({ ok: false, detail: err instanceof Error ? err.message : String(err) })
		}
	})
}

function serializeEntry(entry: KnownValidUrl): string {
	return JSON.stringify(entry, null, '\t')
}

/** Rewrite tests/utils/known-urls.json with the given entries. */
async function rewriteKnownUrls(entries: KnownValidUrl[]): Promise<void> {
	await writeFile(KNOWN_URLS_FILE, `${JSON.stringify(entries, null, '\t')}\n`, 'utf-8')
}

async function main(): Promise<void> {
	// hash -> href, deduplicated across all wallets and the built HTML.
	const referenced = new Map<string, string>()
	let nonHttps = 0

	for (const url of collectUrls()) {
		if (shouldSkipUrl(getUrl(url))) {
			continue
		}

		const href = labeledUrl(url).url

		// Repository-relative references (e.g. screenshots) and other non-HTTPS
		// URLs cannot be fetched; the URL check test skips them too.
		if (!href.startsWith('https://')) {
			nonHttps++
			continue
		}

		referenced.set(sha1(href), href)
	}

	process.stdout.write('Building site to scan for hardcoded external URLs...\n')
	execSync('pnpm run build', { cwd: REPO_ROOT, stdio: 'inherit' })

	for (const [href] of findExternalUrlsInDist(DIST_DIR)) {
		if (shouldSkipUrl(href)) {
			continue
		}

		if (!href.startsWith('https://')) {
			nonHttps++
			continue
		}

		referenced.set(sha1(href), href)
	}

	if (nonHttps > 0) {
		process.stdout.write(`Skipped ${nonHttps.toString()} non-HTTPS (repository-relative) URLs.\n`)
	}

	const knownHashes = new Set(knownValidUrls.map(known => known.urlHash))
	const kept = knownValidUrls.filter(known => referenced.has(known.urlHash))
	const stale = knownValidUrls.filter(known => !referenced.has(known.urlHash))
	const toFetch = Array.from(referenced.entries()).filter(([hash]) => !knownHashes.has(hash))

	process.stdout.write(
		`${referenced.size.toString()} unique URLs referenced: ${kept.length.toString()} already known-valid, ${stale.length.toString()} stale, ${toFetch.length.toString()} new to fetch.\n`,
	)

	const limit = pLimit(FETCH_CONCURRENCY)
	const results = await Promise.all(
		toFetch.map(([hash, href]) =>
			limit(async () => {
				const outcome = await fetchUrl(href)

				process.stdout.write(`${outcome.ok ? 'ok ' : 'FAIL'} ${href} (${outcome.detail})\n`)

				return {
					entry: { url: href, urlHash: hash, retrieved: today() },
					outcome,
				}
			}),
		),
	)

	const added = results.filter(result => result.outcome.ok).map(result => result.entry)
	const failed = results.filter(result => !result.outcome.ok)

	if (added.length > 0 || stale.length > 0) {
		await rewriteKnownUrls([...kept, ...added])

		for (const staleEntry of stale) {
			process.stdout.write(`Removed stale entry: ${staleEntry.url}\n`)
		}

		process.stdout.write(
			`Updated tests/utils/known-urls.json: ${added.length.toString()} added, ${stale.length.toString()} removed.\n`,
		)
	}

	if (failed.length > 0) {
		process.stderr.write(
			`\n${failed.length.toString()} URL(s) could not be validated automatically.\n` +
				'This is often bot protection (e.g. a Cloudflare challenge or 403) rather than a dead link.\n' +
				'Please check each URL below in your browser. If it loads correctly, add its entry to\n' +
				'tests/utils/known-urls.json manually. If it does not, fix or remove the\n' +
				'URL from the wallet data.\n\n',
		)

		for (const failure of failed) {
			process.stderr.write(
				`- ${failure.entry.url}\n  (${failure.outcome.detail})\n${serializeEntry(failure.entry)}\n`,
			)
		}

		process.exit(1)
	}

	process.stdout.write('All referenced URLs are known-valid.\n')
}

await main()
