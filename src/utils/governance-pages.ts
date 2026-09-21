import { repositoryBranch, repositoryUrl } from '@/constants'

const rawRepositoryURL = `https://raw.githubusercontent.com/walletbeat/walletbeat/${repositoryBranch}`

/**
 * Governance documents published as pages on this site.
 *
 * This list is the single source of truth: it generates the routes under
 * `/governance/`, and `rewriteGovernanceRepoURL` only turns a link into an
 * on-site URL if its target appears here. Links to any other governance file
 * stay on GitHub rather than becoming a dead on-site link.
 */
export const publishedGovernanceDocs = [
	'/governance/communications/channels/communication-channels.md',
	'/governance/communications/policy/communications-policy.md',
	'/governance/grants/2025-02-ethereum-foundation-pectra-proactive-grant-round/proposal/proposal.md',
	'/governance/grants/2025-07-ethereum-foundation-esp-grant-proposal/proposal.md',
	'/governance/grants/2026-04-giveth-ethereum-security-qf-round/project-info.md',
	'/governance/treasury/treasury-transparency.md',
] as const

export type PublishedGovernanceDoc = (typeof publishedGovernanceDocs)[number]

function isPublished(repoRootRelativePath: string): repoRootRelativePath is PublishedGovernanceDoc {
	return (publishedGovernanceDocs as readonly string[]).includes(repoRootRelativePath)
}

/** Site URL of a published governance document. */
export function governanceDocPageURL(doc: PublishedGovernanceDoc): string {
	return `${doc.slice(0, -'.md'.length)}/`
}

/**
 * Resolve a repo-root-relative URL found in a Markdown document.
 * Returns null for URLs that are not governance files, leaving them to the
 * standard rewriting rules.
 */
export function rewriteGovernanceRepoURL(repoRootRelativeURL: string): string | null {
	const suffixIndex = repoRootRelativeURL.search(/[?#]/)
	const path = suffixIndex === -1 ? repoRootRelativeURL : repoRootRelativeURL.slice(0, suffixIndex)
	const suffix = suffixIndex === -1 ? '' : repoRootRelativeURL.slice(suffixIndex)

	if (!path.startsWith('/governance/')) {
		return null
	}

	if (isPublished(path)) {
		return governanceDocPageURL(path) + suffix
	}

	// Governance images live next to their document rather than under `public/`.
	if (/\.(png|svg)$/.test(path)) {
		return `${rawRepositoryURL}${path}${suffix}`
	}

	return `${repositoryUrl}/blob/${repositoryBranch}${path}${suffix}`
}
