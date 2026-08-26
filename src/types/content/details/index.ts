import type { TypographicContent } from '../../content'
import type { Strings } from '../../utils/string-templates'
import type { AccountRecoveryDetails } from './account-recovery'
import type { AccountUnruggabilityDetails } from './account-unruggability'
import type { AddressCorrelationDetails } from './address-correlation'
import type { ChainVerificationDetails } from './chain-verification'
import type { FundingDetails } from './funding'
import type { PrivateTransfersDetails } from './private-transfers'
import type { ScamPreventionDetails } from './scam-prevention'
import type { SecurityAuditsDetails } from './security-audits'
import type { TransactionInclusionDetails } from './transaction-inclusion'

/**
 * The single source of truth for canonical structured evaluation details.
 *
 * Each entry is a format-neutral domain model produced by an attribute
 * evaluator and consumed by the web, Markdown and JSON adapters. Adding an
 * entry here fails compilation in every adapter registry that does not handle
 * it, which is the point: meaning is derived once, adapters only format.
 *
 * New entries exist because of distinct domain meaning, not because an
 * attribute or a view exists.
 */
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

/** Discriminator values of all canonical structured detail models. */
export type StructuredDetailsType = keyof StructuredDetailsByType

/** Any canonical structured evaluation detail model. */
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

/** Type predicate for canonical structured details. */
export function isStructuredDetails(
	details: EvaluationDetails<Strings> | undefined,
): details is StructuredDetails {
	return details !== undefined && 'type' in details && details.type in structuredDetailsTypes
}
