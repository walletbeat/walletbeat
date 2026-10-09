import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { Variant } from '@/schema/variants'
import { firefoxAddonSlugs } from '@/tools/usage-stats-collector/firefox-addons'
import {
	collectUsageStats,
	firefoxAddonUrl,
	type GithubRepository,
	parseGithubRepository,
	parseUsageStatsSnapshot,
	serializeUsageStats,
	USAGE_STATS_FILE,
	type UsageStatsFetchers,
	utcToday,
} from '@/tools/usage-stats-collector/usage-stats-collector-lib'
import { daysBetween } from '@/types/date'
import { getRepositoryRoot } from '@/utils/codebase'

const fakeFetchers: UsageStatsFetchers = {
	githubStars: async ({ owner, repo }: GithubRepository) => {
		await Promise.resolve()

		return owner.length * 100 + repo.length
	},
	firefoxAverageDailyUsers: async slug => {
		await Promise.resolve()

		return slug.length
	},
}

describe('parseGithubRepository', () => {
	it('parses repository URLs', () => {
		expect(parseGithubRepository('https://github.com/MetaMask/metamask-extension')).toEqual({
			owner: 'MetaMask',
			repo: 'metamask-extension',
		})
		expect(parseGithubRepository('https://github.com/floating/frame/')).toEqual({
			owner: 'floating',
			repo: 'frame',
		})
		expect(parseGithubRepository('https://github.com/floating/frame.git')).toEqual({
			owner: 'floating',
			repo: 'frame',
		})
	})

	it('rejects organization, non-GitHub and deep URLs', () => {
		expect(parseGithubRepository('https://github.com/LedgerHQ/')).toBeNull()
		expect(parseGithubRepository('https://gitlab.com/owner/repo')).toBeNull()
		expect(parseGithubRepository('https://github.com/owner/repo/tree/main')).toBeNull()
	})
})

describe('collectUsageStats', () => {
	it('collects statistics per wallet, sorted by wallet ID, and skips non-repository URLs', async () => {
		const { snapshot, skipped } = await collectUsageStats(
			[
				{
					id: 'zeta',
					repositories: ['https://github.com/zeta/wallet', 'https://github.com/zeta'],
					firefoxAddonSlug: null,
				},
				{ id: 'alpha', repositories: [], firefoxAddonSlug: 'alpha-wallet' },
				{ id: 'nothing', repositories: ['https://example.com/repo'], firefoxAddonSlug: null },
			],
			fakeFetchers,
			'2026-01-02',
		)

		expect(snapshot).toEqual({
			retrieved: '2026-01-02',
			wallets: {
				alpha: {
					githubRepositories: [],
					firefoxAddon: {
						url: 'https://addons.mozilla.org/firefox/addon/alpha-wallet/',
						averageDailyUsers: 12,
					},
				},
				zeta: {
					githubRepositories: [{ url: 'https://github.com/zeta/wallet', stars: 406 }],
					firefoxAddon: null,
				},
			},
		})
		expect(Object.keys(snapshot.wallets)).toEqual(['alpha', 'zeta'])
		expect(skipped).toEqual([
			{ id: 'nothing', url: 'https://example.com/repo' },
			{ id: 'zeta', url: 'https://github.com/zeta' },
		])
		expect(parseUsageStatsSnapshot(JSON.parse(serializeUsageStats(snapshot)))).toEqual(snapshot)
	})

	it('fails rather than writing a snapshot with missing data', async () => {
		await expect(
			collectUsageStats(
				[{ id: 'alpha', repositories: [], firefoxAddonSlug: 'alpha-wallet' }],
				{
					...fakeFetchers,
					firefoxAverageDailyUsers: () => Promise.reject(new Error('HTTP 503')),
				},
				'2026-01-02',
			),
		).rejects.toThrow('HTTP 503')
	})
})

describe('parseUsageStatsSnapshot', () => {
	it('rejects malformed snapshots', () => {
		expect(() => parseUsageStatsSnapshot({ retrieved: '2026-13-01', wallets: {} })).toThrow()
		expect(() =>
			parseUsageStatsSnapshot({
				retrieved: '2026-01-02',
				wallets: { alpha: { githubRepositories: [{ url: 'x', stars: 1 }], firefoxAddon: null } },
			}),
		).toThrow('canonical GitHub repository URL')
		expect(() =>
			parseUsageStatsSnapshot({
				retrieved: '2026-01-02',
				wallets: {
					alpha: {
						githubRepositories: [{ url: 'https://github.com/a/b', stars: -1 }],
						firefoxAddon: null,
					},
				},
			}),
		).toThrow('non-negative integer')
	})
})

describe('Firefox add-on mapping', () => {
	it('only lists known wallets that have a browser extension', () => {
		for (const [walletId, slug] of Object.entries(firefoxAddonSlugs)) {
			const wallet = Object.values(allWallets).find(({ metadata }) => metadata.id === walletId)

			expect(wallet, walletId).toBeDefined()
			expect(wallet?.variants[Variant.BROWSER], walletId).toBe(true)
			expect(() => firefoxAddonUrl(slug ?? '')).not.toThrow()
		}
	})
})

describe(`${USAGE_STATS_FILE} snapshot`, () => {
	const snapshot = parseUsageStatsSnapshot(
		JSON.parse(fs.readFileSync(path.join(getRepositoryRoot(), USAGE_STATS_FILE), 'utf-8')),
	)

	it('is serialized canonically', () => {
		expect(fs.readFileSync(path.join(getRepositoryRoot(), USAGE_STATS_FILE), 'utf-8')).toBe(
			serializeUsageStats(snapshot),
		)
	})

	it('is not dated in the future', () => {
		expect(daysBetween(snapshot.retrieved, utcToday())).toBeGreaterThanOrEqual(0)
	})

	it('only covers known wallets, sorted by ID', () => {
		const ids = Object.keys(snapshot.wallets)

		expect(ids).toEqual(ids.toSorted((a, b) => a.localeCompare(b)))

		const walletIds = Object.values(allWallets).map(({ metadata }) => metadata.id)

		for (const id of ids) {
			expect(walletIds, id).toContain(id)
		}
	})
})
