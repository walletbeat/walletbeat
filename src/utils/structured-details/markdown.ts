import { accountRecoveryDrillWording } from '@/schema/features/security/account-recovery'
import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client'
import { monetizationStrategyName } from '@/schema/features/transparency/monetization'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import { gitCommitRefPinRegExp } from '@/schema/url'
import type { StructuredDetails } from '@/types/content/details'
import type { AccountRecoveryDetails } from '@/types/content/details/account-recovery'
import type { AccountUnruggabilityDetails } from '@/types/content/details/account-unruggability'
import type { AddressCorrelationDetails } from '@/types/content/details/address-correlation'
import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
import type { FundingDetails } from '@/types/content/details/funding'
import type { GuardianPolicyDetail } from '@/types/content/details/guardian-policy'
import type { GuardianScenarioOutcomeDetail } from '@/types/content/details/guardian-scenarios'
import type { InlineText } from '@/types/content/details/inline'
import {
	type PrivateTransfersDetails,
	privateTransferTechnologyName,
} from '@/types/content/details/private-transfers'
import type { ScamPreventionDetails } from '@/types/content/details/scam-prevention'
import {
	auditsByRecency,
	formatCalendarDate,
	type SecurityAuditsDetails,
} from '@/types/content/details/security-audits'
import type { TransactionInclusionDetails } from '@/types/content/details/transaction-inclusion'
import { commaListFormat, renderStrings } from '@/types/utils/text'

import type { StructuredDetailsContext } from './context'
import {
	accountRecoverySummary,
	accountUnruggabilitySummary,
	addressCorrelationIntro,
	addressCorrelationLeakSentence,
	bugBountySentences,
	guardianPolicyBlocks,
	securityAuditFindingsSentence,
	securityAuditsSummary,
	securityFlawSeverityLabel,
	transactionInclusionProse,
} from './prose'
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

			if (span.kind === 'link') {
				return span.strong === true ? `[**${text}**](${span.url})` : `[${text}](${span.url})`
			}

			if (span.code === true) {
				return `\`${text}\``
			}

			if (span.strong === true) {
				return `**${text}**`
			}

			return span.emphasis === true ? `*${text}*` : text
		})
		.join('')
}

/**
 * A reference label, safe to place inside a Markdown link.
 *
 * Square brackets (common in filename-derived labels) are escaped so they
 * cannot parse as nested or reference-style links, and commit-hash pins in
 * GitHub-like labels (`foo.ts L1-2 @abcdef1`) render as the code they are.
 */
export function markdownLinkLabel(label: string): string {
	return label.replace(/[[\]]/gu, String.raw`\$&`).replace(gitCommitRefPinRegExp, '`$&`')
}

/**
 * Claim references as a parenthesized list of links.
 *
 * Markdown has no reference sidebar, so every claim carries its own sources
 * inline. `wallet-page-markdown` then drops these from the flat reference list
 * so each source is listed exactly once.
 */
function referencesSuffixMarkdown(references: ReferenceInput): string {
	const links = toFullyQualified(references)
		.flatMap(reference => reference.urls)
		.map(url => `[${markdownLinkLabel(url.label)}](${url.url})`)

	return links.length === 0 ? '' : ` (${links.join(', ')})`
}

/** Render guardian policy blocks, which lists render natively in Markdown. */
function renderGuardianPolicyMarkdown(policy: GuardianPolicyDetail): string[] {
	return guardianPolicyBlocks(policy).map(block =>
		block.kind === 'paragraph'
			? block.text
			: [block.lead, '', ...block.items.map(item => `- ${item}`)].join('\n'),
	)
}

/** A scenario bullet: the scenario, and its consequence when it has one. */
function renderScenarioMarkdown(scenario: GuardianScenarioOutcomeDetail): string {
	return scenario.consequence === undefined
		? `- **${scenario.scenario}**`
		: `- **${scenario.scenario}**: ${scenario.consequence}`
}

function renderAccountRecoveryMarkdown(
	details: AccountRecoveryDetails,
	context: StructuredDetailsContext,
): string {
	const blocks: string[] = [accountRecoverySummary(details)]

	if (details.guardianPolicy !== undefined) {
		blocks.push(
			'#### Account recovery implementation',
			...renderGuardianPolicyMarkdown(details.guardianPolicy),
		)
	}

	if (details.unrecoverableScenarios.length > 0) {
		blocks.push(
			'#### Account recovery failure scenarios',
			details.unrecoverableScenarios.map(renderScenarioMarkdown).join('\n'),
		)
	}

	if (details.recoverableScenarios.length > 0) {
		blocks.push(
			'#### Account recovery success scenarios',
			details.recoverableScenarios.map(renderScenarioMarkdown).join('\n'),
		)
	}

	if (details.drills !== undefined) {
		blocks.push('#### Account recovery drills')

		if (details.drills.configured.length > 0) {
			blocks.push(
				'{{WALLET_NAME}} periodically runs the following account recovery drills:',
				details.drills.configured
					.map(
						drill =>
							`- ${accountRecoveryDrillWording(drill.type).label} (every ${drill.reminderEveryNDays.toString()} days)${referencesSuffixMarkdown(drill.references)}`,
					)
					.join('\n'),
			)
		}

		if (details.drills.missing.length > 0) {
			blocks.push(
				'{{WALLET_NAME}} does not run the following recommended account recovery drills:',
				details.drills.missing
					.map(drillType => `- ${accountRecoveryDrillWording(drillType).label}`)
					.join('\n'),
			)
		}
	}

	return renderStrings(blocks.join('\n\n'), { ...context.strings })
}

function renderAccountUnruggabilityMarkdown(
	details: AccountUnruggabilityDetails,
	context: StructuredDetailsContext,
): string {
	const blocks: string[] = [accountUnruggabilitySummary(details)]

	if (details.guardianPolicy !== undefined) {
		blocks.push(
			'#### Account recovery implementation',
			...renderGuardianPolicyMarkdown(details.guardianPolicy),
		)
	}

	if (details.takeoverScenarios.length > 0) {
		blocks.push(
			'#### Account takeover scenarios',
			details.takeoverScenarios.map(renderScenarioMarkdown).join('\n'),
		)
	}

	return renderStrings(blocks.join('\n\n'), { ...context.strings })
}

function renderAddressCorrelationMarkdown(
	details: AddressCorrelationDetails,
	context: StructuredDetailsContext,
): string {
	const bullets = details.leaks.map(
		leak => `- ${addressCorrelationLeakSentence(leak)}${referencesSuffixMarkdown(leak.references)}`,
	)

	return renderStrings([addressCorrelationIntro, '', ...bullets].join('\n'), {
		...context.strings,
	})
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

function renderFundingMarkdown(details: FundingDetails, context: StructuredDetailsContext): string {
	const sources =
		details.strategies.length === 0
			? 'unknown sources'
			: details.strategies.map(({ strategy }) => monetizationStrategyName(strategy)).join(', ')

	return renderStrings(`**{{WALLET_NAME}}** is funded by **${sources}**.`, { ...context.strings })
}

function renderPrivateTransfersMarkdown(
	details: PrivateTransfersDetails,
	context: StructuredDetailsContext,
): string {
	const blocks: string[] = []

	if (details.defaultModeNote !== undefined) {
		blocks.push(renderInlineTextMarkdown(details.defaultModeNote, context))
	}

	for (const technology of details.technologies) {
		blocks.push(
			`#### ${privateTransferTechnologyName[technology.technology]}`,
			`**Sending:** ${renderInlineTextMarkdown(technology.sending, context)}`,
			`**Receiving:** ${renderInlineTextMarkdown(technology.receiving, context)}`,
			`**Spending:** ${renderInlineTextMarkdown(technology.spending, context)}`,
			...technology.notes.map(note => renderInlineTextMarkdown(note, context)),
		)
	}

	return blocks.join('\n\n')
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
			const references = referencesSuffixMarkdown(warning.references)

			return `- ${description}${nestedItems}${conclusion}${references}`
		})
		.join('\n')
}

function renderSecurityAuditsMarkdown(
	details: SecurityAuditsDetails,
	context: StructuredDetailsContext,
): string {
	const blocks: string[] = [securityAuditsSummary(details)]

	for (const audit of auditsByRecency(details)) {
		blocks.push(
			`#### Audit by ${audit.auditor.name} (${formatCalendarDate(audit.auditDate)})`,
			securityAuditFindingsSentence(audit),
		)

		if (audit.findings.kind === 'flaws') {
			blocks.push(
				audit.findings.flaws
					.map(
						// Finding titles are verbatim strings from independent audit
						// reports, so they are quoted as code rather than reflowed as prose.
						flaw =>
							`- **${securityFlawSeverityLabel[flaw.severity]}**: \`${flaw.name}\` (${
								flaw.status === 'FIXED' ? 'fixed' : 'not fixed'
							})`,
					)
					.join('\n'),
			)
		}

		const references = referencesSuffixMarkdown(audit.references).trim()

		if (references !== '') {
			blocks.push(references)
		}
	}

	if (details.bugBounty !== undefined) {
		blocks.push('#### Bug bounty program', ...bugBountySentences(details.bugBounty))

		const references = referencesSuffixMarkdown(details.bugBounty.references).trim()

		if (references !== '') {
			blocks.push(references)
		}
	}

	return renderStrings(blocks.join('\n\n'), { ...context.strings })
}

function renderTransactionInclusionMarkdown(
	details: TransactionInclusionDetails,
	context: StructuredDetailsContext,
): string {
	return transactionInclusionProse(details)
		.map(
			block =>
				`${renderStrings(block.text, { ...context.strings })}${referencesSuffixMarkdown(
					block.claim === 'l1' ? details.l1References : details.l2References,
				)}`,
		)
		.join('\n\n')
}

/** Exhaustive Markdown renderer registry. */
const markdownRenderers: StructuredDetailsRenderers<string> = {
	accountRecovery: renderAccountRecoveryMarkdown,
	accountUnruggability: renderAccountUnruggabilityMarkdown,
	addressCorrelation: renderAddressCorrelationMarkdown,
	chainVerification: renderChainVerificationMarkdown,
	funding: renderFundingMarkdown,
	privateTransfers: renderPrivateTransfersMarkdown,
	scamPrevention: renderScamPreventionMarkdown,
	securityAudits: renderSecurityAuditsMarkdown,
	transactionInclusion: renderTransactionInclusionMarkdown,
}

/** Render canonical structured details as Markdown. */
export function renderStructuredDetailsMarkdown(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): string {
	return dispatchStructuredDetails(markdownRenderers, details, context)
}
