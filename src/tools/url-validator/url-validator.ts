import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { writeFile } from 'fs/promises'
import { request } from 'https'
import pLimit from 'p-limit'
import path from 'path'

import { allWallets } from '@/data/wallets'
import { collectAllRefs } from '@/schema/reference'
import { getUrl, type Url } from '@/schema/url'
import { fetchUrl } from '@/tests/utils/fetch-url'
import {
	isCheckableUrl,
	type KnownValidUrl,
	knownValidUrls,
	serializeKnownValidUrl,
	urlHash,
} from '@/tests/utils/known-urls'
import { findExternalUrlsInDist } from '@/tests/utils/scan-html-urls'
import { today } from '@/types/date'
import { getRepositoryRoot } from '@/utils/codebase'

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

/** Rewrite tests/utils/known-urls.json with the given entries. */
async function rewriteKnownUrls(entries: KnownValidUrl[]): Promise<void> {
	await writeFile(KNOWN_URLS_FILE, `${JSON.stringify(entries, null, '\t')}\n`, 'utf-8')
}

async function main(): Promise<void> {
	process.stdout.write('Building site to scan for hardcoded external URLs...\n')
	execSync('pnpm run build', { cwd: REPO_ROOT, stdio: 'inherit' })

	const hrefs = [...collectUrls().map(getUrl), ...findExternalUrlsInDist(DIST_DIR).keys()]
	// hash -> href, deduplicated across all wallets and the built HTML.
	const referenced = new Map(
		hrefs.filter(isCheckableUrl).map(href => [urlHash(href), href] as const),
	)

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
				`- ${failure.entry.url}\n  (${failure.outcome.detail})\n${serializeKnownValidUrl(failure.entry)}\n`,
			)
		}

		process.exit(1)
	}

	process.stdout.write('All referenced URLs are known-valid.\n')
}

await main()
