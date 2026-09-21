import type { ConcreteWalletEvalStrings } from '@/schema/attributes'
import { accountRecoveryDrillWording } from '@/schema/features/security/account-recovery'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import { gitCommitRefPinRegExp } from '@/schema/url'
import {
	accountRecoveryConfiguredDrillsIntro,
	type AccountRecoveryDetails,
	accountRecoveryDrillsHeading,
	accountRecoveryFailureScenariosHeading,
	accountRecoveryMissingDrillsIntro,
	accountRecoverySuccessScenariosHeading,
	accountRecoverySummary,
} from '@/types/content/account-recovery-details'
import {
	accountTakeoverScenariosHeading,
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
import type { DetailBlock, DetailListItem } from '@/types/content/detail-block'
import { type FundingDetails, fundingSentence } from '@/types/content/funding-details'
import { guardianPolicyBlocks, guardianPolicyHeading } from '@/types/content/guardian-policy'
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
	bugBountyHeading,
	bugBountySentences,
	formatCalendarDate,
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

/**
 * One bullet: sub-bullets are indented under it and its conclusion is indented
 * to the same depth, so both stay inside the bullet rather than ending the list.
 */
function renderDetailListItemMarkdown(
	item: DetailListItem,
	strings: ConcreteWalletEvalStrings,
): string {
	const text = renderStrings(item.text, { ...strings })
	const items = item.items?.map(sub => `\n  - ${renderStrings(sub, { ...strings })}`).join('') ?? ''
	const conclusion =
		item.conclusion === undefined ? '' : `\n\n  ${renderStrings(item.conclusion, { ...strings })}`

	return `- ${text}${items}${conclusion}${referencesSuffixMarkdown(item.references)}`
}

/**
 * The single place that knows Markdown's block syntax.
 *
 * Every structured detail renders through here, so heading depth, bullet
 * markers, indentation and blank-line separation are decided once instead of
 * being re-derived by each model's renderer.
 */
export function renderDetailBlocksMarkdown(
	blocks: DetailBlock[],
	strings: ConcreteWalletEvalStrings,
): string {
	return blocks
		.map(block => {
			switch (block.kind) {
				case 'heading':
					return `#### ${renderStrings(block.text, { ...strings })}`
				case 'paragraph':
					return `${renderStrings(block.text, { ...strings })}${referencesSuffixMarkdown(block.references)}`
				case 'list':
					return block.items.map(item => renderDetailListItemMarkdown(item, strings)).join('\n')
				case 'references':
					return referencesSuffixMarkdown(block.references).trim()
			}
		})
		.filter(rendered => rendered !== '')
		.join('\n\n')
}

function scenarioItem(scenario: GuardianScenarioOutcomeDetail): DetailListItem {
	return {
		text:
			scenario.consequence === undefined
				? `**${scenario.scenario}**`
				: `**${scenario.scenario}**: ${scenario.consequence}`,
	}
}

function renderAccountRecoveryMarkdown(details: AccountRecoveryDetails): DetailBlock[] {
	const blocks: DetailBlock[] = [{ kind: 'paragraph', text: accountRecoverySummary(details) }]

	if (details.guardianPolicy !== undefined) {
		blocks.push(
			{ kind: 'heading', text: guardianPolicyHeading },
			...guardianPolicyBlocks(details.guardianPolicy),
		)
	}

	if (details.unrecoverableScenarios.length > 0) {
		blocks.push(
			{ kind: 'heading', text: accountRecoveryFailureScenariosHeading },
			{ kind: 'list', items: details.unrecoverableScenarios.map(scenarioItem) },
		)
	}

	if (details.recoverableScenarios.length > 0) {
		blocks.push(
			{ kind: 'heading', text: accountRecoverySuccessScenariosHeading },
			{ kind: 'list', items: details.recoverableScenarios.map(scenarioItem) },
		)
	}

	if (details.drills !== undefined) {
		blocks.push({ kind: 'heading', text: accountRecoveryDrillsHeading })

		if (details.drills.configured.length > 0) {
			blocks.push(
				{ kind: 'paragraph', text: accountRecoveryConfiguredDrillsIntro },
				{
					kind: 'list',
					items: details.drills.configured.map(drill => ({
						text: `${accountRecoveryDrillWording(drill.type).label} (every ${drill.reminderEveryNDays.toString()} days)`,
						references: drill.references,
					})),
				},
			)
		}

		if (details.drills.missing.length > 0) {
			blocks.push(
				{ kind: 'paragraph', text: accountRecoveryMissingDrillsIntro },
				{
					kind: 'list',
					items: details.drills.missing.map(drillType => ({
						text: accountRecoveryDrillWording(drillType).label,
					})),
				},
			)
		}
	}

	return blocks
}

function renderAccountUnruggabilityMarkdown(details: AccountUnruggabilityDetails): DetailBlock[] {
	const blocks: DetailBlock[] = [{ kind: 'paragraph', text: accountUnruggabilitySummary(details) }]

	if (details.guardianPolicy !== undefined) {
		blocks.push(
			{ kind: 'heading', text: guardianPolicyHeading },
			...guardianPolicyBlocks(details.guardianPolicy),
		)
	}

	if (details.takeoverScenarios.length > 0) {
		blocks.push(
			{ kind: 'heading', text: accountTakeoverScenariosHeading },
			{ kind: 'list', items: details.takeoverScenarios.map(scenarioItem) },
		)
	}

	return blocks
}

function renderAddressCorrelationMarkdown(details: AddressCorrelationDetails): DetailBlock[] {
	return [
		{ kind: 'paragraph', text: addressCorrelationIntro },
		{
			kind: 'list',
			items: details.leaks.map(leak => ({
				text: addressCorrelationLeakSentence(leak),
				references: leak.references,
			})),
		},
	]
}

function renderChainVerificationMarkdown(details: ChainVerificationDetails): DetailBlock[] {
	return [{ kind: 'paragraph', text: chainVerificationSentence(details) }]
}

function renderFundingMarkdown(details: FundingDetails): DetailBlock[] {
	return [{ kind: 'paragraph', text: fundingSentence(details) }]
}

function renderPrivateTransfersMarkdown(
	details: PrivateTransfersDetails,
	context: StructuredDetailsContext,
): DetailBlock[] {
	const paragraph = (text: string): DetailBlock => ({ kind: 'paragraph', text })
	const blocks: DetailBlock[] = []

	if (details.defaultModeNote !== undefined) {
		blocks.push(paragraph(renderInlineTextMarkdown(details.defaultModeNote, context)))
	}

	for (const technology of details.technologies) {
		blocks.push(
			{ kind: 'heading', text: privateTransferTechnologyName[technology.technology] },
			paragraph(`**Sending:** ${renderInlineTextMarkdown(technology.sending, context)}`),
			paragraph(`**Receiving:** ${renderInlineTextMarkdown(technology.receiving, context)}`),
			paragraph(`**Spending:** ${renderInlineTextMarkdown(technology.spending, context)}`),
			...technology.notes.map(note => paragraph(renderInlineTextMarkdown(note, context))),
		)
	}

	return blocks
}

function renderScamPreventionMarkdown(
	details: ScamPreventionDetails,
	context: StructuredDetailsContext,
): DetailBlock[] {
	return [
		{
			kind: 'list',
			items: details.warnings.map(warning => ({
				// The wallet name leads each warning, so it is emphasized here
				// rather than everywhere the name appears in a detail.
				text: renderStrings(warning.description, { ...emphasizedStrings(context) }),
				...(warning.items !== undefined && { items: warning.items }),
				...(warning.conclusion !== undefined && { conclusion: warning.conclusion }),
				references: warning.references,
			})),
		},
	]
}

function renderSecurityAuditsMarkdown(details: SecurityAuditsDetails): DetailBlock[] {
	const blocks: DetailBlock[] = [{ kind: 'paragraph', text: securityAuditsSummary(details) }]

	for (const audit of auditsByRecency(details)) {
		const variants = auditVariantNames(audit)

		blocks.push({
			kind: 'heading',
			text: `Audit by ${audit.auditor.name} (${formatCalendarDate(audit.auditDate)})`,
		})

		if (variants.length > 0) {
			blocks.push({ kind: 'paragraph', text: `This audit covered ${commaListFormat(variants)}.` })
		}

		blocks.push({ kind: 'paragraph', text: securityAuditFindingsSentence(audit) })

		if (audit.findings.kind === 'flaws') {
			blocks.push({
				kind: 'list',
				items: audit.findings.flaws.map(flaw => ({
					// Finding titles are verbatim strings from independent audit
					// reports, so they are quoted as code rather than reflowed as prose.
					text: `**${securityFlawSeverityLabel[flaw.severity]}**: \`${flaw.name}\` (${
						flaw.status === 'FIXED' ? 'fixed' : 'not fixed'
					})`,
				})),
			})
		}

		blocks.push({ kind: 'references', references: audit.references })
	}

	if (details.bugBounty !== undefined) {
		blocks.push(
			{ kind: 'heading', text: bugBountyHeading },
			...bugBountySentences(details.bugBounty).map((text): DetailBlock => ({
				kind: 'paragraph',
				text,
			})),
			{ kind: 'references', references: details.bugBounty.references },
		)
	}

	return blocks
}

function renderTransactionInclusionMarkdown(details: TransactionInclusionDetails): DetailBlock[] {
	return transactionInclusionProse(details).map(block => ({
		kind: 'paragraph',
		text: block.text,
		references: block.claim === 'l1' ? details.l1References : details.l2References,
	}))
}

const markdownRenderers: StructuredDetailsRenderers<DetailBlock[]> = {
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
	return renderDetailBlocksMarkdown(
		dispatchStructuredDetails(markdownRenderers, details, context),
		context.strings,
	)
}
