import type { CustomContent, TypographicContent } from '../../content'
import type { Strings } from '../../utils/string-templates'
import type { AddressCorrelationDetails } from './address-correlation'
import type { ChainVerificationDetails } from './chain-verification'
import type { FundingDetails } from './funding'
import type { PrivateTransfersDetails } from './private-transfers'
import type { ScamPreventionDetails } from './scam-prevention'
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
	addressCorrelation: AddressCorrelationDetails
	chainVerification: ChainVerificationDetails
	funding: FundingDetails
	privateTransfers: PrivateTransfersDetails
	scamPrevention: ScamPreventionDetails
	transactionInclusion: TransactionInclusionDetails
}

/** Discriminator values of all canonical structured detail models. */
export type StructuredDetailsType = keyof StructuredDetailsByType

/** Any canonical structured evaluation detail model. */
export type StructuredDetails = StructuredDetailsByType[StructuredDetailsType]

/**
 * The detail content an evaluation may carry: ordinary typographic prose, a
 * canonical structured model, or nothing at all.
 */
export type EvaluationDetails<_Strings extends Strings = null> =
	| TypographicContent<_Strings>
	| StructuredDetails
	// TEMPORARY: bridge for detail families not yet migrated to canonical models.
	// Removed once every family is structured; see `CustomContent`.
	| CustomContent
	| undefined

/** Type predicate for canonical structured details. */
export function isStructuredDetails(details: unknown): details is StructuredDetails {
	return (
		typeof details === 'object' &&
		details !== null &&
		Object.hasOwn(details, 'type') &&
		!Object.hasOwn(details, 'contentType')
	)
}

/** Thrown when an adapter is handed a discriminator it does not know about. */
export function unknownStructuredDetailsType(details: never): never {
	const type = (details as { type?: unknown }).type

	throw new Error(`Unknown structured details type: ${String(type)}`)
}
