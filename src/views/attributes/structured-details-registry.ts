import type { Component } from 'svelte'

import type { StructuredDetailsByType, StructuredDetailsType } from '@/types/content/details'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
import AccountRecoveryDetails from '@/views/attributes/security/AccountRecoveryDetails.svelte'
import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'
import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
import AccountUnruggabilityDetails from '@/views/attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'

/** Props every structured-details view receives. */
export interface StructuredDetailsViewProps<_Details> {
	details: _Details
	context: StructuredDetailsContext
}

/**
 * Exhaustive web renderer registry.
 *
 * Adding a member to `StructuredDetailsByType` without adding its view here is
 * a compile error. This registry is bundled for the browser only; the Markdown
 * and JSON registries live separately so their dependencies stay server-side.
 */
export const structuredDetailsViews: {
	[_Type in StructuredDetailsType]: Component<
		StructuredDetailsViewProps<StructuredDetailsByType[_Type]>
	>
} = {
	accountRecovery: AccountRecoveryDetails,
	accountUnruggability: AccountUnruggabilityDetails,
	addressCorrelation: AddressCorrelationDetails,
	chainVerification: ChainVerificationDetails,
	funding: FundingDetails,
	privateTransfers: PrivateTransfersDetails,
	scamPrevention: ScamAlertDetails,
	securityAudits: SecurityAuditsDetails,
	transactionInclusion: TransactionInclusionDetails,
}
