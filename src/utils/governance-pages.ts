import { repositoryUrl } from '@/constants'

const rawRepositoryURL = 'https://raw.githubusercontent.com/walletbeat/walletbeat/HEAD'

/** Governance docs served as site pages. Links to other governance files go to GitHub. */
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

export function governanceDocPageURL(doc: PublishedGovernanceDoc): string {
	return `${doc.slice(0, -'.md'.length)}/`
}

/** Returns null for non-governance URLs so the standard rewriting rules apply. */
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

	return `${repositoryUrl}/blob/HEAD${path}${suffix}`
}
