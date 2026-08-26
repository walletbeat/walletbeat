import { type FullyQualifiedReference, toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/structured-details'

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

export function structuredDetailsReferences(details: StructuredDetails): FullyQualifiedReference[] {
	return dispatchStructuredDetails(referenceCollectors, details, noContext)
}

/**
 * Whether two references make the same claim: the same set of URLs, with the
 * same explanation. Two references sharing URLs but explaining different
 * things are different claims, and both must still be shown.
 */
function sameReference(
	reference: FullyQualifiedReference,
	other: FullyQualifiedReference,
): boolean {
	if (reference.explanation !== other.explanation) {
		return false
	}

	const urls = new Set(reference.urls.map(url => url.url))
	const otherUrls = new Set(other.urls.map(url => url.url))

	return urls.size === otherUrls.size && [...urls].every(url => otherUrls.has(url))
}

export function referencesNotIn(
	references: FullyQualifiedReference[],
	displayed: FullyQualifiedReference[],
): FullyQualifiedReference[] {
	return references.filter(reference => !displayed.some(shown => sameReference(reference, shown)))
}
