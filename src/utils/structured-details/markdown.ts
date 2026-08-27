import { accountRecoveryDrillWording } from '@/schema/features/security/account-recovery'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import { gitCommitRefPinRegExp } from '@/schema/url'
import {
	accountRecoveryConfiguredDrillsIntro,
	type AccountRecoveryDetails,
	accountRecoveryMissingDrillsIntro,
	accountRecoverySummary,
} from '@/types/content/account-recovery-details'
import {
	type AccountUnruggabilityDetails,
	accountUnruggabilitySummary,
} from '@/types/content/account-unruggability-details'
import {
	type AddressCorrelationDetails,
	addressCorrelationIntro,
	addressCorrelationLeakSentence,
} from '@/types/content/address-correlation-details'
import {
	type ChainVerificationDetails,
	chainVerificationSentence,
} from '@/types/content/chain-verification-details'
import { type FundingDetails, fundingSentence } from '@/types/content/funding-details'
import { guardianPolicyBlocks, type GuardianPolicyDetail } from '@/types/content/guardian-policy'
import type { GuardianScenarioOutcomeDetail } from '@/types/content/guardian-scenarios'
import type { InlineText } from '@/types/content/inline'
import {
	type PrivateTransfersDetails,
	privateTransferTechnologyName,
} from '@/types/content/private-transfers-details'
import type { ScamPreventionDetails } from '@/types/content/scam-prevention-details'
import {
	auditsByRecency,
	auditVariantNames,
	bugBountySentences,
	formatCalendarDate,
	type SecurityAuditDetail,
	securityAuditFindingsSentence,
	type SecurityAuditsDetails,
	securityAuditsSummary,
	securityFlawSeverityLabel,
} from '@/types/content/security-audits-details'
import type { StructuredDetails } from '@/types/content/structured-details'
import {
	type TransactionInclusionDetails,
	transactionInclusionProse,
} from '@/types/content/transaction-inclusion-details'
import { commaListFormat, renderStrings } from '@/types/utils/text'

import { emphasizedStrings, type StructuredDetailsContext } from './context'
import { dispatchStructuredDetails, type StructuredDetailsRenderers } from './registry'

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

function renderGuardianPolicyMarkdown(policy: GuardianPolicyDetail): string[] {
	return guardianPolicyBlocks(policy).map(block =>
		block.kind === 'paragraph'
			? block.text
			: [block.lead, '', ...block.items.map(item => `- ${item}`)].join('\n'),
	)
}

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
				accountRecoveryConfiguredDrillsIntro,
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
				accountRecoveryMissingDrillsIntro,
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
	return renderStrings(chainVerificationSentence(details), { ...context.strings })
}

function renderFundingMarkdown(details: FundingDetails, context: StructuredDetailsContext): string {
	return renderStrings(fundingSentence(details), { ...context.strings })
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
			const description = renderStrings(warning.description, { ...emphasizedStrings(context) })
			const nestedItems = warning.items?.map(item => `\n  - ${item}`).join('') ?? ''
			const conclusion = warning.conclusion === undefined ? '' : `\n\n  ${warning.conclusion}`
			const references = referencesSuffixMarkdown(warning.references)

			return `- ${description}${nestedItems}${conclusion}${references}`
		})
		.join('\n')
}

function auditScopeSuffix(audit: SecurityAuditDetail): string {
	const variants = auditVariantNames(audit)

	return variants.length === 0 ? '' : `\n\nThis audit covered ${commaListFormat(variants)}.`
}

function renderSecurityAuditsMarkdown(
	details: SecurityAuditsDetails,
	context: StructuredDetailsContext,
): string {
	const blocks: string[] = [securityAuditsSummary(details)]

	for (const audit of auditsByRecency(details)) {
		blocks.push(
			`#### Audit by ${audit.auditor.name} (${formatCalendarDate(audit.auditDate)})${auditScopeSuffix(audit)}`,
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

export function renderStructuredDetailsMarkdown(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): string {
	return dispatchStructuredDetails(markdownRenderers, details, context)
}
