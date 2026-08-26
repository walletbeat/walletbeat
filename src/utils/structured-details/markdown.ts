import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client'
import { monetizationStrategyName } from '@/schema/features/transparency/monetization'
import type { StructuredDetails } from '@/types/content/details'
import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
import type { FundingDetails } from '@/types/content/details/funding'
import type { InlineText } from '@/types/content/details/inline'
import type { TransactionInclusionDetails } from '@/types/content/details/transaction-inclusion'
import type { ScamPreventionDetails } from '@/types/content/details/scam-prevention'
import { commaListFormat, renderStrings } from '@/types/utils/text'

import type { StructuredDetailsContext } from './context'
import { transactionInclusionProse } from './prose'
import { dispatchStructuredDetails, type StructuredDetailsRenderers } from './registry'

/**
 * Markdown adapter for canonical structured evaluation details.
 *
 * This module owns Markdown syntax and nothing else. It never decides what a
 * detail means, which claims belong together, or how they are worded beyond
 * the shared templates the evaluator authored.
 */

/** Render an inline sentence as Markdown, resolving template placeholders. */
export function renderInlineTextMarkdown(
	inline: InlineText,
	context: StructuredDetailsContext,
): string {
	return inline
		.map(span => {
			const text = renderStrings(span.text, { ...context.strings })

			return span.kind === 'link' ? `[${text}](${span.url})` : text
		})
		.join('')
}

function renderChainVerificationMarkdown(
	details: ChainVerificationDetails,
	context: StructuredDetailsContext,
): string {
	const clients = details.lightClients.map(client => {
		const { url, label } = ethereumL1LightClientUrl(client)

		return `[${label}](${url})`
	})

	return renderStrings(
		`**{{WALLET_NAME}}** performs L1 chain state verification using ${commaListFormat(clients)} light client${details.lightClients.length === 1 ? '' : 's'}.`,
		{ ...context.strings },
	)
}

function renderFundingMarkdown(
	details: FundingDetails,
	context: StructuredDetailsContext,
): string {
	const sources =
		details.strategies.length === 0
			? 'unknown sources'
			: details.strategies
					.map(({ strategy }) => monetizationStrategyName(strategy))
					.join(', ')

	return renderStrings(`**{{WALLET_NAME}}** is funded by **${sources}**.`, { ...context.strings })
}

function renderScamPreventionMarkdown(
	details: ScamPreventionDetails,
	context: StructuredDetailsContext,
): string {
	return details.warnings
		.map(warning => {
			const description = renderStrings(warning.description, {
				...context.strings,
				WALLET_NAME: `**${context.strings.WALLET_NAME}**`,
			})
			const nestedItems = warning.items?.map(item => `\n  - ${item}`).join('') ?? ''
			const conclusion = warning.conclusion === undefined ? '' : `\n\n  ${warning.conclusion}`

			return `- ${description}${nestedItems}${conclusion}`
		})
		.join('\n')
}

function renderTransactionInclusionMarkdown(
	details: TransactionInclusionDetails,
	context: StructuredDetailsContext,
): string {
	return transactionInclusionProse(details)
		.map(block => renderStrings(block, { ...context.strings }))
		.join('\n\n')
}

/** Exhaustive Markdown renderer registry. */
const markdownRenderers: StructuredDetailsRenderers<string> = {
	chainVerification: renderChainVerificationMarkdown,
	funding: renderFundingMarkdown,
	scamPrevention: renderScamPreventionMarkdown,
	transactionInclusion: renderTransactionInclusionMarkdown,
}

/** Render canonical structured details as Markdown. */
export function renderStructuredDetailsMarkdown(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): string {
	return dispatchStructuredDetails(markdownRenderers, details, context)
}
