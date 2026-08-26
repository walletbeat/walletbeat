import { type FullyQualifiedReference, toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/details'

import type { StructuredDetailsContext } from './context'
import { dispatchStructuredDetails, type StructuredDetailsRenderers } from './registry'

/**
 * Claim-level references carried by canonical detail models.
 *
 * Visual adapters render these next to the claim they support, then use
 * `referencesNotIn` to drop them from the evaluation's flat reference list, so
 * every reference is displayed exactly once and none is silently lost.
 */
const referenceCollectors: StructuredDetailsRenderers<FullyQualifiedReference[]> = {
	accountRecovery: details =>
		details.drills === undefined
			? []
			: details.drills.configured.flatMap(drill => drill.references),
	accountUnruggability: () => [],
	addressCorrelation: details => details.leaks.flatMap(leak => leak.references),
	chainVerification: () => [],
	funding: () => [],
	privateTransfers: () => [],
	securityAudits: details => [
		...details.audits.flatMap(audit => audit.references),
		...(details.bugBounty === undefined ? [] : details.bugBounty.references),
	],
	scamPrevention: details =>
		details.warnings.flatMap(warning => toFullyQualified(warning.references)),
	transactionInclusion: details => [
		...toFullyQualified(details.l2References),
		...toFullyQualified(details.l1References),
	],
}

const noContext: StructuredDetailsContext = {
	strings: {
		WALLET_NAME: '',
		WALLET_PSEUDONYM_SINGULAR: '',
		WALLET_PSEUDONYM_PLURAL: '',
	},
}

/** Every claim-level reference carried by these details, in model order. */
export function structuredDetailsReferences(details: StructuredDetails): FullyQualifiedReference[] {
	return dispatchStructuredDetails(referenceCollectors, details, noContext)
}

/** Whether two references point at exactly the same set of URLs. */
function sameUrls(reference: FullyQualifiedReference, other: FullyQualifiedReference): boolean {
	const urls = new Set(reference.urls.map(url => url.url))
	const otherUrls = new Set(other.urls.map(url => url.url))

	return urls.size === otherUrls.size && [...urls].every(url => otherUrls.has(url))
}

/** The references in `references` that `displayed` does not already cover. */
export function referencesNotIn(
	references: FullyQualifiedReference[],
	displayed: FullyQualifiedReference[],
): FullyQualifiedReference[] {
	return references.filter(reference => !displayed.some(shown => sameUrls(reference, shown)))
}
