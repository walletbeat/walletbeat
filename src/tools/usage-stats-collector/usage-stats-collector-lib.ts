import Ajv2020 from 'ajv/dist/2020'

import {
	type GithubRepository,
	githubRepositoryUrl,
	parseGithubRepository,
} from '@/constants/github'
import { assertCalendarDate, type CalendarDate } from '@/types/date'

/** Path of the committed snapshot, relative to the repository root. */
export const USAGE_STATS_FILE = 'data/usage-stats.json'

/** Usage statistics for one GitHub repository. */
export interface GithubRepositoryStats {
	/** Canonical `https://github.com/<owner>/<repo>` URL of the repository. */
	url: string

	/** Number of GitHub stars ("stargazers") the repository has. */
	stars: number
}

/** Usage statistics for one Firefox add-on. */
export interface FirefoxAddonStats {
	/** `https://addons.mozilla.org/firefox/addon/<slug>/` URL of the add-on. */
	url: string

	/**
	 * Average daily users over the last 28 days, as reported by the
	 * addons.mozilla.org API. This is the "Users" figure shown on the add-on's
	 * listing page.
	 */
	averageDailyUsers: number
}

/** Usage statistics for one wallet. */
export interface WalletUsageStats {
	/** One entry per GitHub repository listed in the wallet's metadata. */
	githubRepositories: GithubRepositoryStats[]

	/** The wallet's Firefox add-on, or null if it has none on record. */
	firefoxAddon: FirefoxAddonStats | null
}

/** A dated snapshot of wallet usage statistics. */
export interface UsageStatsSnapshot {
	/** The date the statistics were retrieved (UTC). */
	retrieved: CalendarDate

	/** Usage statistics, keyed by wallet ID. Wallets with no statistics are omitted. */
	wallets: Record<string, WalletUsageStats>
}

/** The sources a wallet's usage statistics are collected from. */
export interface WalletUsageSources {
	/** Wallet ID. */
	id: string

	/** Repository URLs from the wallet's metadata (`urls.repositories`). */
	repositories: string[]

	/** The wallet's addons.mozilla.org slug, if it has a Firefox add-on. */
	firefoxAddonSlug: string | null
}

/** Fetch functions used to collect statistics; replaceable in tests. */
export interface UsageStatsFetchers {
	githubStars: (repository: GithubRepository) => Promise<number>
	firefoxAverageDailyUsers: (slug: string) => Promise<number>
}

const FIREFOX_ADDON_SLUG = /^[A-Za-z0-9_-]+$/

/** Listing page URL of a Firefox add-on. */
export function firefoxAddonUrl(slug: string): string {
	if (!FIREFOX_ADDON_SLUG.test(slug)) {
		throw new Error(`Invalid Firefox add-on slug: ${slug}`)
	}

	return `https://addons.mozilla.org/firefox/addon/${slug}/`
}

/** Read a non-negative integer field from an API response object. */
function countField(body: unknown, field: string, source: string): number {
	if (typeof body !== 'object' || body === null || !(field in body)) {
		throw new Error(`${source}: response has no \`${field}\` field`)
	}

	const value: unknown = Reflect.get(body, field)

	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${source}: \`${field}\` is not a non-negative integer`)
	}

	return value
}

/** Fetch a URL as JSON, throwing on any non-2xx response. */
async function fetchJson(
	url: string,
	headers: Record<string, string>,
	timeoutMs: number,
): Promise<unknown> {
	const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })

	if (!response.ok) {
		throw new Error(`${url}: HTTP ${response.status}`)
	}

	return await response.json()
}

/**
 * Fetchers backed by the GitHub REST API and the addons.mozilla.org API.
 * A GitHub token is optional and raises the API rate limit.
 */
export function apiFetchers(options: {
	githubToken: string | null
	timeoutMs: number
}): UsageStatsFetchers {
	const userAgent = { 'user-agent': 'walletbeat-usage-stats-collector' }

	return {
		githubStars: async repository => {
			const url = `https://api.github.com/repos/${repository.owner}/${repository.repo}`
			const body = await fetchJson(
				url,
				{
					...userAgent,
					accept: 'application/vnd.github+json',
					'x-github-api-version': '2022-11-28',
					...(options.githubToken === null
						? {}
						: { authorization: `Bearer ${options.githubToken}` }),
				},
				options.timeoutMs,
			)

			return countField(body, 'stargazers_count', url)
		},
		firefoxAverageDailyUsers: async slug => {
			const url = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(slug)}/`
			const body = await fetchJson(url, userAgent, options.timeoutMs)

			return countField(body, 'average_daily_users', url)
		},
	}
}

/**
 * Collect usage statistics for each wallet. Repository URLs that are not
 * `github.com/<owner>/<repo>` URLs are skipped and returned in `skipped`.
 * A failing fetch rejects the whole collection.
 */
export async function collectUsageStats(
	wallets: WalletUsageSources[],
	fetchers: UsageStatsFetchers,
	retrieved: CalendarDate,
): Promise<{ snapshot: UsageStatsSnapshot; skipped: Array<{ id: string; url: string }> }> {
	const skipped: Array<{ id: string; url: string }> = []
	const entries: Array<[string, WalletUsageStats]> = []

	for (const wallet of wallets.toSorted((a, b) => a.id.localeCompare(b.id))) {
		const githubRepositories: GithubRepositoryStats[] = []

		for (const url of wallet.repositories) {
			const repository = parseGithubRepository(url)

			if (repository === null) {
				skipped.push({ id: wallet.id, url })
				continue
			}

			githubRepositories.push({
				url: githubRepositoryUrl(repository),
				stars: await fetchers.githubStars(repository),
			})
		}

		const firefoxAddon =
			wallet.firefoxAddonSlug === null
				? null
				: {
						url: firefoxAddonUrl(wallet.firefoxAddonSlug),
						averageDailyUsers: await fetchers.firefoxAverageDailyUsers(wallet.firefoxAddonSlug),
					}

		if (githubRepositories.length > 0 || firefoxAddon !== null) {
			entries.push([wallet.id, { githubRepositories, firefoxAddon }])
		}
	}

	return { snapshot: { retrieved, wallets: Object.fromEntries(entries) }, skipped }
}

/** Serialize a snapshot with a trailing newline, as committed to the repository. */
export function serializeUsageStats(snapshot: UsageStatsSnapshot): string {
	return `${JSON.stringify(snapshot, null, '\t')}\n`
}

/** Today's date in UTC. */
export function utcToday(): CalendarDate {
	return assertCalendarDate(new Date().toISOString().slice(0, 'YYYY-MM-DD'.length))
}

/** `UsageStatsSnapshot` as stored in JSON, before its date is checked. */
type UsageStatsSnapshotJson = Omit<UsageStatsSnapshot, 'retrieved'> & { retrieved: string }

const usageStatsSnapshotSchema = {
	type: 'object',
	properties: {
		retrieved: { type: 'string' },
		wallets: {
			type: 'object',
			required: [],
			additionalProperties: {
				type: 'object',
				properties: {
					githubRepositories: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								url: { type: 'string' },
								stars: { type: 'integer', minimum: 0 },
							},
							required: ['url', 'stars'],
							additionalProperties: false,
						},
					},
					firefoxAddon: {
						type: ['object', 'null'],
						properties: {
							url: { type: 'string' },
							averageDailyUsers: { type: 'integer', minimum: 0 },
						},
						required: ['url', 'averageDailyUsers'],
						additionalProperties: false,
					},
				},
				required: ['githubRepositories', 'firefoxAddon'],
				additionalProperties: false,
			},
		},
	},
	required: ['retrieved', 'wallets'],
	additionalProperties: false,
}

const ajv = new Ajv2020({ allErrors: true })
const isUsageStatsSnapshotJson = ajv.compile<UsageStatsSnapshotJson>(usageStatsSnapshotSchema)

/** Validate parsed snapshot JSON, returning it typed. Throws listing the invalid fields. */
export function parseUsageStatsSnapshot(json: unknown): UsageStatsSnapshot {
	if (!isUsageStatsSnapshotJson(json)) {
		throw new Error(
			`Invalid usage statistics snapshot: ${ajv.errorsText(isUsageStatsSnapshotJson.errors)}`,
		)
	}

	for (const [id, { githubRepositories }] of Object.entries(json.wallets)) {
		for (const { url } of githubRepositories) {
			const parsed = parseGithubRepository(url)

			if (parsed === null || githubRepositoryUrl(parsed) !== url) {
				throw new Error(`wallets.${id}: ${url} is not a canonical GitHub repository URL`)
			}
		}
	}

	return { ...json, retrieved: assertCalendarDate(json.retrieved) }
}
