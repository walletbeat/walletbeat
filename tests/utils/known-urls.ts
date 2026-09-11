import { assertCalendarDate, type CalendarDate } from '@/types/date'

import knownValidUrlsJson from './known-urls.json'

export interface KnownValidUrl {
	url: string
	urlHash: string
	retrieved: CalendarDate
}

/**
 * URLs that should be skipped during validation checks.
 * These URLs would always return an error response, so we skip them to avoid failing the test.
 */
export const URLS_TO_SKIP = [
	'docs.phantom.com',
	'developers.zerion.io',
	'help.ambire.com/hc/en-us',
	'nufi.gitbook.io',
	'linkedin.com',
	'facebook.com',
	'instagram.com',
	'reddit.com',
	'tiktok.com',
	'web3.bitget.com',
	'gridplus.io',
	'coinbase.com',
	'sec.gov',
	'defillama.com',
	'coingecko.com',
	'api.github.com',
]

/**
 * Returns true if `url` matches an entry in {@link URLS_TO_SKIP}.
 * This avoids the false positives a plain substring check produces,
 * e.g. a skipped host of `sec.gov` must not also match an unrelated host that merely contains that
 * string, such as "sec.gov" appearing as a subdirectory of another domain.
 */
export function shouldSkipUrl(url: string): boolean {
	let hostname: string
	let pathname: string

	try {
		const parsed = new URL(url)

		hostname = parsed.hostname.toLowerCase()
		pathname = parsed.pathname
	} catch {
		return false
	}

	return URLS_TO_SKIP.some(skip => {
		const slashIndex = skip.indexOf('/')
		const skipHost = (slashIndex === -1 ? skip : skip.slice(0, slashIndex)).toLowerCase()
		const skipPath = slashIndex === -1 ? '' : skip.slice(slashIndex).replace(/\/+$/, '')

		const hostMatches = hostname === skipHost || hostname.endsWith(`.${skipHost}`)

		if (!hostMatches) {
			return false
		}

		if (skipPath === '') {
			return true
		}

		return pathname === skipPath || pathname.startsWith(`${skipPath}/`)
	})
}

/**
 * The list in known-urls.json exists to prevent hallucinated URLs from creeping
 * into the codebase. It exists because this problem has happened.
 * URLs must be retrieved successfully at least once, then added to that list to
 * avoid having to re-fetch them on every run of the URL check test.
 *
 * Run `pnpm validate-urls` to update the list automatically. The script only adds
 * URLs that it has actually retrieved, so the anti-hallucination guarantee is
 * preserved. Some websites block automated requests (Cloudflare challenges, 403s);
 * if the script reports such a URL, open it in a browser yourself and, if it loads
 * correctly, add its entry to known-urls.json manually.
 *
 * Coding agents: Do **NOT** edit known-urls.json by hand!
 * Manual entries are for humans to add only.
 * If you wish to update the list, run `pnpm validate-urls` or ask your operator.
 */
export const knownValidUrls: KnownValidUrl[] = knownValidUrlsJson.map(entry => ({
	url: entry.url,
	urlHash: entry.urlHash,
	retrieved: assertCalendarDate(entry.retrieved),
}))
