import {
	type EthereumL1LightClient,
	ethereumL1LightClientUrl,
} from '@/schema/features/security/light-client'
import {
	type MonetizationStrategy,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import {
	type TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/details'
import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
import type { FundingDetails } from '@/types/content/details/funding'
import type { InlineText } from '@/types/content/details/inline'
import type {
	L1BroadcastSupport,
	L2ForceInclusionCapability,
	TransactionInclusionDetails,
} from '@/types/content/details/transaction-inclusion'
import type {
	ScamPreventionDetails,
	ScamWarningKind,
} from '@/types/content/details/scam-prevention'
import { renderStrings } from '@/types/utils/text'

import type { StructuredDetailsContext } from './context'
import { dispatchStructuredDetails, type StructuredDetailsRenderers } from './registry'

/**
 * JSON adapter for canonical structured evaluation details.
 *
 * This module owns the public DTO shape: every variant has a dedicated typed
 * export type, so the internal model can change without silently changing the
 * published payload. Templates are resolved, references are normalized, and
 * calendar dates stay `YYYY-MM-DD` strings.
 */

export interface ReferenceUrlJsonExport {
	label: string
	url: string
}

export interface ReferenceJsonExport {
	explanation?: string
	urls: ReferenceUrlJsonExport[]
}

/** An inline sentence: resolved plain text, plus its links when it has any. */
export interface InlineTextJsonExport {
	text: string
	links?: Array<{ text: string; url: string }>
}

export interface ChainVerificationLightClientJsonExport {
	id: EthereumL1LightClient
	name: string
	url: string
}

export interface ChainVerificationDetailsJsonExport {
	type: 'chainVerification'
	lightClients: ChainVerificationLightClientJsonExport[]
}

export interface FundingStrategyJsonExport {
	strategy: MonetizationStrategy
	name: string
	userAligned: boolean
}

export interface FundingDetailsJsonExport {
	type: 'funding'
	strategies: FundingStrategyJsonExport[]
	revenueBreakdownIsPublic: boolean
}

export interface ScamWarningDetailsJsonExport {
	kind: ScamWarningKind
	description: string
	items?: string[]
	conclusion?: string
	references?: ReferenceJsonExport[]
}

export interface ScamPreventionDetailsJsonExport {
	type: 'scamPrevention'
	warnings: ScamWarningDetailsJsonExport[]
}

export interface TransactionInclusionL2JsonExport {
	l2: TransactionSubmissionL2Type
	name: string
	forceInclusion: L2ForceInclusionCapability
}

export interface TransactionInclusionDetailsJsonExport {
	type: 'transactionInclusion'
	l1Broadcast: L1BroadcastSupport
	l2s: TransactionInclusionL2JsonExport[]
	l1References?: ReferenceJsonExport[]
	l2References?: ReferenceJsonExport[]
}

/** Public discriminated union of exported structured details. */
export type StructuredDetailsJsonExport =
	| ChainVerificationDetailsJsonExport
	| FundingDetailsJsonExport
	| ScamPreventionDetailsJsonExport
	| TransactionInclusionDetailsJsonExport

/** Normalize references to the published reference shape. */
export function serializeReferences(references: ReferenceInput): ReferenceJsonExport[] {
	return toFullyQualified(references).map(ref => ({
		...(ref.explanation !== undefined && { explanation: ref.explanation }),
		urls: ref.urls.map(url => ({ label: url.label, url: url.url })),
	}))
}

/** Serialize an inline sentence, resolving templates and preserving links. */
export function serializeInlineText(
	inline: InlineText,
	context: StructuredDetailsContext,
): InlineTextJsonExport {
	const links = inline
		.filter(span => span.kind === 'link')
		.map(span => ({ text: renderStrings(span.text, { ...context.strings }), url: span.url }))

	return {
		text: inline.map(span => renderStrings(span.text, { ...context.strings })).join(''),
		...(links.length > 0 && { links }),
	}
}

function serializeChainVerificationDetails(
	details: ChainVerificationDetails,
): ChainVerificationDetailsJsonExport {
	return {
		type: 'chainVerification',
		lightClients: details.lightClients.map(client => {
			const { url, label } = ethereumL1LightClientUrl(client)

			return { id: client, name: label, url }
		}),
	}
}

function serializeFundingDetails(details: FundingDetails): FundingDetailsJsonExport {
	return {
		type: 'funding',
		strategies: details.strategies.map(({ strategy, userAligned }) => ({
			strategy,
			name: monetizationStrategyName(strategy),
			userAligned,
		})),
		revenueBreakdownIsPublic: details.revenueBreakdownIsPublic,
	}
}

function serializeScamPreventionDetails(
	details: ScamPreventionDetails,
	context: StructuredDetailsContext,
): ScamPreventionDetailsJsonExport {
	return {
		type: 'scamPrevention',
		warnings: details.warnings.map(warning => {
			const references =
				warning.references === undefined ? [] : serializeReferences(warning.references)

			return {
				kind: warning.kind,
				description: renderStrings(warning.description, { ...context.strings }),
				...(warning.items !== undefined && { items: warning.items }),
				...(warning.conclusion !== undefined && { conclusion: warning.conclusion }),
				...(references.length > 0 && { references }),
			}
		}),
	}
}

function serializeTransactionInclusionDetails(
	details: TransactionInclusionDetails,
): TransactionInclusionDetailsJsonExport {
	const l1References =
		details.l1References === undefined ? [] : serializeReferences(details.l1References)
	const l2References =
		details.l2References === undefined ? [] : serializeReferences(details.l2References)

	return {
		type: 'transactionInclusion',
		l1Broadcast: details.l1Broadcast,
		l2s: details.l2s.map(({ l2, forceInclusion }) => ({
			l2,
			name: transactionSubmissionL2TypeName(l2),
			forceInclusion,
		})),
		...(l1References.length > 0 && { l1References }),
		...(l2References.length > 0 && { l2References }),
	}
}

/** Exhaustive JSON serializer registry. */
const jsonSerializers: StructuredDetailsRenderers<StructuredDetailsJsonExport> = {
	chainVerification: serializeChainVerificationDetails,
	funding: serializeFundingDetails,
	scamPrevention: serializeScamPreventionDetails,
	transactionInclusion: serializeTransactionInclusionDetails,
}

/** Serialize canonical structured details to their published JSON DTO. */
export function serializeStructuredDetails(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): StructuredDetailsJsonExport {
	return dispatchStructuredDetails(jsonSerializers, details, context)
}
