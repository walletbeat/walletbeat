import { describe, expect, it } from 'vitest'

import { githubBlobUrl } from '@/constants/github'
import { getRepositoryRoot } from '@/utils/codebase'
import {
	githubInRepoPath,
	isNonPublishedRepoPath,
	rewriteUrl,
} from '@/utils/satteri-url-rewrite-plugin'

describe('rewriteUrl', () => {
	it('strips a markdown filename for a matched collection mapping', () => {
		// /resources/docs/... maps to /docs/..., and a .md filename maps to an index route.
		expect(
			rewriteUrl('/resources/docs/wallet-testing/data-collection/data-collection.md', '/'),
		).toEqual({ url: '/docs/wallet-testing/data-collection/', matched: true })
	})

	it('maps root-level Markdown to its own page', () => {
		expect(rewriteUrl('/resources/docs/css-attribute-authoring.md', '/')).toEqual({
			url: '/docs/css-attribute-authoring/',
			matched: true,
		})
	})

	it('strips a markdown filename for a governance mapping', () => {
		expect(rewriteUrl('/governance/roadmap/2026/2026-roadmap.md', '/')).toEqual({
			url: '/governance/roadmap/2026/',
			matched: true,
		})
	})

	it('maps About Markdown to its collection route', () => {
		expect(rewriteUrl('/src/content/about/mission/mission.md', '/')).toEqual({
			url: '/about/mission/',
			matched: true,
		})
	})

	it('preserves query string and fragment when rewriting', () => {
		expect(
			rewriteUrl(
				'/resources/docs/wallet-testing/data-collection/data-collection.md?x=1#section',
				'/',
			),
		).toEqual({ url: '/docs/wallet-testing/data-collection/?x=1#section', matched: true })
	})

	it('maps an Astro page directory to its site route', () => {
		expect(rewriteUrl('/src/pages/about/faq/', '/')).toEqual({
			url: '/about/faq/',
			matched: true,
		})
	})

	it('maps a public asset to the root', () => {
		expect(rewriteUrl('/public/images/foo.png', '/')).toEqual({
			url: '/images/foo.png',
			matched: true,
		})
	})

	it('rewrites a PDF under a non-collection dir (resources/talks) to a GitHub link', () => {
		// resources/talks is not a rendered collection, so it is not served.
		expect(
			rewriteUrl('/resources/talks/2026-06-eth-berlin/ethereum-day/ethereum-day.pdf', '/'),
		).toEqual({
			url: githubBlobUrl('/resources/talks/2026-06-eth-berlin/ethereum-day/ethereum-day.pdf'),
			matched: true,
		})
	})

	it('rewrites a tool README under a non-collection dir (src/tools) to a GitHub link', () => {
		expect(rewriteUrl('/src/tools/wallet-data-collection/README.md', '/')).toEqual({
			url: githubBlobUrl('/src/tools/wallet-data-collection/README.md'),
			matched: true,
		})
	})

	it('does not strip a bare directory segment under a stripFilename mapping', () => {
		// /governance/grants/<round> is a directory (no extension); it must not be
		// truncated to /governance/grants/.
		expect(
			rewriteUrl(
				'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round',
				'/',
			),
		).toEqual({
			url: '/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round',
			matched: true,
		})
	})

	it('keeps an authored section link on a rendered Markdown page', () => {
		expect(
			rewriteUrl(
				'/resources/docs/wallet-testing/l1-provider-independence/l1-provider-independence.md#step-2-create-a-dedicated-browser-or-device-for-wallet-testing',
				'/',
			),
		).toEqual({
			url: '/docs/wallet-testing/l1-provider-independence/#step-2-create-a-dedicated-browser-or-device-for-wallet-testing',
			matched: true,
		})
	})

	it('resolves a relative tool README link to a GitHub link', () => {
		// source: /resources/docs/wallet-testing/data-collection/data-collection.md
		const sourceDir = '/resources/docs/wallet-testing/data-collection/'

		expect(rewriteUrl('../../../../src/tools/wallet-data-collection/README.md', sourceDir)).toEqual(
			{
				url: githubBlobUrl('/src/tools/wallet-data-collection/README.md'),
				matched: true,
			},
		)
	})

	it('resolves a relative PDF link under a non-collection dir to a GitHub link', () => {
		const sourceDir = '/resources/docs/wallet-testing/data-collection/'

		expect(rewriteUrl('../../../../resources/talks/foo.pdf', sourceDir)).toEqual({
			url: githubBlobUrl('/resources/talks/foo.pdf'),
			matched: true,
		})
	})

	it('rewrites a non-served (.sh) file link to the GitHub blob URL', () => {
		expect(
			rewriteUrl(
				'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/convert.sh',
				'/',
			),
		).toEqual({
			url: githubBlobUrl(
				'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/convert.sh',
			),
			matched: true,
		})
	})

	it('keeps serving a served file (e.g. .pdf) at its site URL rather than linking to GitHub', () => {
		expect(
			rewriteUrl(
				'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/proposal.pdf',
				'/',
			),
		).toEqual({
			url: '/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/proposal.pdf',
			matched: true,
		})
	})
})

// ---------------------------------------------------------------------------
// isNonPublishedRepoPath — repo-root paths that the site does not publish
// ---------------------------------------------------------------------------

describe('isNonPublishedRepoPath', () => {
	const repoRoot = getRepositoryRoot()

	it('flags a top-level repo file such as /CONTRIBUTING.md', () => {
		expect(isNonPublishedRepoPath('/CONTRIBUTING.md', repoRoot)).toBe(true)
	})

	it('flags a repo-internal directory such as /.agents', () => {
		expect(isNonPublishedRepoPath('/.agents', repoRoot)).toBe(true)
	})

	it('flags a PDF under a non-collection dir (resources/talks) as non-published', () => {
		expect(
			isNonPublishedRepoPath(
				'/resources/talks/2026-06-eth-berlin/ethereum-day/ethereum-day.pdf',
				repoRoot,
			),
		).toBe(true)
	})

	it('flags a tool README under a non-collection dir (src/tools) as non-published', () => {
		expect(isNonPublishedRepoPath('/src/tools/wallet-data-collection/README.md', repoRoot)).toBe(
			true,
		)
	})

	it('allows a published governance path', () => {
		expect(
			isNonPublishedRepoPath(
				'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round',
				repoRoot,
			),
		).toBe(false)
	})

	it('allows a published docs path', () => {
		expect(isNonPublishedRepoPath('/docs/wallet-testing/data-collection/', repoRoot)).toBe(false)
	})

	it('allows an asset served from public/', () => {
		expect(isNonPublishedRepoPath('/logo.svg', repoRoot)).toBe(false)
	})
})

describe('githubInRepoPath', () => {
	const repoRoot = getRepositoryRoot()

	it('extracts the path from a blob URL with a single-segment branch', () => {
		expect(
			githubInRepoPath(
				'https://github.com/walletbeat/walletbeat/blob/beta/resources/docs/impact/impact.md',
				repoRoot,
			),
		).toBe('/resources/docs/impact/impact.md')
	})

	it('extracts the path from a tree URL', () => {
		expect(
			githubInRepoPath(
				'https://github.com/walletbeat/walletbeat/tree/beta/resources/talks',
				repoRoot,
			),
		).toBe('/resources/talks')
	})

	it('extracts the path when the branch itself contains slashes', () => {
		expect(
			githubInRepoPath(
				'https://github.com/walletbeat/walletbeat/blob/feature/docs/resources/docs/impact/impact.md',
				repoRoot,
			),
		).toBe('/resources/docs/impact/impact.md')
	})

	it('retains a section anchor on the extracted path', () => {
		expect(
			githubInRepoPath(
				'https://github.com/walletbeat/walletbeat/blob/master/governance/treasury/treasury-transparency.md#L10',
				repoRoot,
			),
		).toBe('/governance/treasury/treasury-transparency.md#L10')
	})

	it('returns null for a non-blob/tree GitHub URL', () => {
		expect(githubInRepoPath('https://github.com/walletbeat/walletbeat', repoRoot)).toBe(null)
	})

	it('returns null for a non-GitHub URL', () => {
		expect(githubInRepoPath('https://beta.walletbeat.eth.limo/about/', repoRoot)).toBe(null)
	})
})
