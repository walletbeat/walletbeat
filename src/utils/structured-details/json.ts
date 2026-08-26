import {
	type EthereumL1LightClient,
	ethereumL1LightClientUrl,
} from '@/schema/features/security/light-client'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import type { StructuredDetails } from '@/types/content/details'
import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
import type { InlineText } from '@/types/content/details/inline'
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

/** Public discriminated union of exported structured details. */
export type StructuredDetailsJsonExport =
	| ChainVerificationDetailsJsonExport
	| ScamPreventionDetailsJsonExport

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

/** Exhaustive JSON serializer registry. */
const jsonSerializers: StructuredDetailsRenderers<StructuredDetailsJsonExport> = {
	chainVerification: serializeChainVerificationDetails,
	scamPrevention: serializeScamPreventionDetails,
}

/** Serialize canonical structured details to their published JSON DTO. */
export function serializeStructuredDetails(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): StructuredDetailsJsonExport {
	return dispatchStructuredDetails(jsonSerializers, details, context)
}
