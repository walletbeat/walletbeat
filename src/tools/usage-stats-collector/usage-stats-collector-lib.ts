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

/** A GitHub repository identified by its owner and name. */
export interface GithubRepository {
	owner: string
	repo: string
}

const GITHUB_REPOSITORY_URL =
	/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/

/**
 * Parse a `https://github.com/<owner>/<repo>` URL. Returns null for anything
 * else, including organization-only URLs such as `https://github.com/<owner>`,
 * which have no star count.
 */
export function parseGithubRepository(url: string): GithubRepository | null {
	const match = GITHUB_REPOSITORY_URL.exec(url)

	if (match === null) {
		return null
	}

	return { owner: match[1], repo: match[2] }
}

/** Canonical URL of a GitHub repository. */
export function githubRepositoryUrl({ owner, repo }: GithubRepository): string {
	return `https://github.com/${owner}/${repo}`
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
 * A GitHub token is optional but raises the API rate limit from 60 to 5,000
 * requests per hour.
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
 * A failing fetch rejects the whole collection, so a snapshot is never written
 * with silently missing data.
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

/** Throw unless `value` is a non-negative integer. */
function assertCount(value: unknown, where: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${where} must be a non-negative integer`)
	}

	return value
}

/** Throw unless `value` is a plain object. */
function assertObject(value: unknown, where: string): object {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${where} must be an object`)
	}

	return value
}

/** Throw unless `value` is a string. */
function assertString(value: unknown, where: string): string {
	if (typeof value !== 'string') {
		throw new Error(`${where} must be a string`)
	}

	return value
}

/** Throw unless `value` has exactly the given keys. */
function assertKeys(value: object, keys: string[], where: string): void {
	const actual = Object.keys(value).toSorted()
	const expected = keys.toSorted()

	if (actual.join(',') !== expected.join(',')) {
		throw new Error(`${where} must have exactly the keys ${expected.join(', ')}`)
	}
}

/**
 * Validate parsed snapshot JSON, returning it typed. Throws with the path of
 * the first invalid field.
 */
export function parseUsageStatsSnapshot(json: unknown): UsageStatsSnapshot {
	const root = assertObject(json, 'snapshot')

	assertKeys(root, ['retrieved', 'wallets'], 'snapshot')

	const retrieved = assertCalendarDate(assertString(Reflect.get(root, 'retrieved'), 'retrieved'))
	const walletsJson = assertObject(Reflect.get(root, 'wallets'), 'wallets')
	const wallets: Record<string, WalletUsageStats> = {}

	for (const [id, statsJson] of Object.entries(walletsJson)) {
		const where = `wallets.${id}`
		const stats = assertObject(statsJson, where)

		assertKeys(stats, ['githubRepositories', 'firefoxAddon'], where)

		const repositoriesJson: unknown = Reflect.get(stats, 'githubRepositories')

		if (!Array.isArray(repositoriesJson)) {
			throw new Error(`${where}.githubRepositories must be an array`)
		}

		const githubRepositories = repositoriesJson.map((repositoryJson: unknown, index) => {
			const repositoryWhere = `${where}.githubRepositories[${index}]`
			const repository = assertObject(repositoryJson, repositoryWhere)

			assertKeys(repository, ['url', 'stars'], repositoryWhere)

			const url = assertString(Reflect.get(repository, 'url'), `${repositoryWhere}.url`)
			const parsed = parseGithubRepository(url)

			if (parsed === null || githubRepositoryUrl(parsed) !== url) {
				throw new Error(`${repositoryWhere}.url must be a canonical GitHub repository URL`)
			}

			return {
				url,
				stars: assertCount(Reflect.get(repository, 'stars'), `${repositoryWhere}.stars`),
			}
		})

		const addonJson: unknown = Reflect.get(stats, 'firefoxAddon')
		let firefoxAddon: FirefoxAddonStats | null = null

		if (addonJson !== null) {
			const addonWhere = `${where}.firefoxAddon`
			const addon = assertObject(addonJson, addonWhere)

			assertKeys(addon, ['url', 'averageDailyUsers'], addonWhere)

			firefoxAddon = {
				url: assertString(Reflect.get(addon, 'url'), `${addonWhere}.url`),
				averageDailyUsers: assertCount(
					Reflect.get(addon, 'averageDailyUsers'),
					`${addonWhere}.averageDailyUsers`,
				),
			}
		}

		wallets[id] = { githubRepositories, firefoxAddon }
	}

	return { retrieved, wallets }
}
