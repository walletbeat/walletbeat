import type { Component } from 'svelte'

import type {
	StructuredDetailsByType,
	StructuredDetailsType,
} from '@/types/content/structured-details'
import type { StructuredDetailsContext } from '@/utils/structured-details/context'
import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
import AccountRecoveryDetails from '@/views/attributes/security/AccountRecoveryDetails.svelte'
import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
import ScamPreventionDetails from '@/views/attributes/security/ScamPreventionDetails.svelte'
import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
import AccountUnruggabilityDetails from '@/views/attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'

export interface StructuredDetailsViewProps<_Details> {
	details: _Details
	context: StructuredDetailsContext
}

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
	scamPrevention: ScamPreventionDetails,
	securityAudits: SecurityAuditsDetails,
	transactionInclusion: TransactionInclusionDetails,
}
