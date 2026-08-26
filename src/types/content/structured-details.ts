import type { TypographicContent } from '../content'
import type { Strings } from '../utils/string-templates'
import type { AccountRecoveryDetails } from './account-recovery-details'
import type { AccountUnruggabilityDetails } from './account-unruggability-details'
import type { AddressCorrelationDetails } from './address-correlation-details'
import type { ChainVerificationDetails } from './chain-verification-details'
import type { FundingDetails } from './funding-details'
import type { PrivateTransfersDetails } from './private-transfers-details'
import type { ScamPreventionDetails } from './scam-alert-details'
import type { SecurityAuditsDetails } from './security-audits-details'
import type { TransactionInclusionDetails } from './transaction-inclusion-details'

export interface StructuredDetailsByType {
	accountRecovery: AccountRecoveryDetails
	accountUnruggability: AccountUnruggabilityDetails
	addressCorrelation: AddressCorrelationDetails
	chainVerification: ChainVerificationDetails
	funding: FundingDetails
	privateTransfers: PrivateTransfersDetails
	scamPrevention: ScamPreventionDetails
	securityAudits: SecurityAuditsDetails
	transactionInclusion: TransactionInclusionDetails
}

export type StructuredDetailsType = keyof StructuredDetailsByType

export type StructuredDetails = StructuredDetailsByType[StructuredDetailsType]

/**
 * The detail content an evaluation may carry: ordinary typographic prose or a
 * canonical structured model. An evaluation with nothing to detail, such as an
 * unrated one, simply omits it.
 */
export type EvaluationDetails<_Strings extends Strings = null> =
	TypographicContent<_Strings> | StructuredDetails

/**
 * Every discriminator value, at runtime.
 *
 * Typed as a record of the same keys, so a new member of
 * `StructuredDetailsByType` fails compilation here too.
 */
const structuredDetailsTypes: Record<StructuredDetailsType, true> = {
	accountRecovery: true,
	accountUnruggability: true,
	addressCorrelation: true,
	chainVerification: true,
	funding: true,
	privateTransfers: true,
	scamPrevention: true,
	securityAudits: true,
	transactionInclusion: true,
}

export function isStructuredDetails(
	details: EvaluationDetails<Strings> | undefined,
): details is StructuredDetails {
	return details !== undefined && 'type' in details && details.type in structuredDetailsTypes
}
