import type { Entity } from '@/schema/entity'
import { type Guardian, guardianMarkdown } from '@/schema/features/security/account-recovery'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import { transactionSubmissionL2TypeName } from '@/schema/features/self-sovereignty/transaction-submission'
import { monetizationStrategyName } from '@/schema/features/transparency/monetization'
import { getUrl, isUrl } from '@/schema/url'
import type { AccountRecoveryDetails } from '@/types/content/details/account-recovery'
import type { AccountUnruggabilityDetails } from '@/types/content/details/account-unruggability'
import {
	type AddressCorrelationLeak,
	correlatedInfoNames,
} from '@/types/content/details/address-correlation'
import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
import type { FundingDetails } from '@/types/content/details/funding'
import type { GuardianPolicyDetail } from '@/types/content/details/guardian-policy'
import {
	auditedInLastYear,
	auditsByRecency,
	type BugBountyDetail,
	formatCalendarDate,
	hasUnaddressedFlaws,
	type SecurityAuditDetail,
	type SecurityAuditsDetails,
} from '@/types/content/details/security-audits'
import {
	forceInclusionCapableL2s,
	forceInclusionIncapableL2s,
	type TransactionInclusionDetails,
} from '@/types/content/details/transaction-inclusion'
import { commaListFormat } from '@/types/utils/text'

/**
 * Shared prose derived from canonical detail models.
 *
 * Wording lives here once so the web view and the Markdown adapter cannot
 * drift. Sentences use `{{WALLET_NAME}}` placeholders and light Markdown
 * emphasis, which every visual adapter already renders; the canonical models
 * themselves stay free of any markup.
 */

/** Introduction shared by every address-correlation rendering. */
export const addressCorrelationIntro =
	'By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:'

/** Comma-separated list ending in "and", as used in correlation sentences. */
function joinedList(items: string[]): string {
	if (items.length <= 1) {
		return items.join('')
	}

	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The bullet describing what one source can correlate. */
export function addressCorrelationLeakSentence(leak: AddressCorrelationLeak): string {
	const info = `**${joinedList(correlatedInfoNames(leak))}**`

	if (leak.source.kind === 'onchain') {
		return `An onchain record permanently associates your ${info} with your wallet address.`
	}

	const { entity } = leak.source
	const privacyPolicy = isUrl(entity.privacyPolicy)
		? ` ([Privacy policy](${getUrl(entity.privacyPolicy)}))`
		: ''

	return `**${entity.name}**${privacyPolicy} may link your wallet address to your ${info}.`
}

/**
 * One rendered transaction-inclusion block, tagged with the claim it makes so
 * adapters can attach the right references to it.
 */
export interface TransactionInclusionBlock {
	claim: 'l1' | 'l2'
	text: string
}

/** How a wallet's funding reads, whatever the adapter. */
export function fundingSentence(details: FundingDetails): string {
	const sources =
		details.strategies.length === 0
			? 'unknown sources'
			: details.strategies.map(({ strategy }) => monetizationStrategyName(strategy)).join(', ')

	return `**{{WALLET_NAME}}** is funded by **${sources}**.`
}

/** How a wallet's L1 chain verification reads, whatever the adapter. */
export function chainVerificationSentence(details: ChainVerificationDetails): string {
	const clients = details.lightClients.map(client => {
		const { url, label } = ethereumL1LightClientUrl(client)

		return `[${label}](${url})`
	})

	return `**{{WALLET_NAME}}** performs L1 chain state verification using ${commaListFormat(
		clients,
	)} light client${details.lightClients.length === 1 ? '' : 's'}.`
}

/** Sentences describing transaction inclusion, one per rendered block. */
export function transactionInclusionProse(
	details: TransactionInclusionDetails,
): TransactionInclusionBlock[] {
	const capable = forceInclusionCapableL2s(details).toSorted()
	const incapable = forceInclusionIncapableL2s(details).toSorted()
	const blocks: TransactionInclusionBlock[] = []

	if (capable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `**{{WALLET_NAME}}** supports L2 force-inclusion withdrawal transactions on **${capable
				.map(transactionSubmissionL2TypeName)
				.join(
					', ',
				)}** L2s.\n\nThis means users may withdraw funds from these L2s without relying on intermediaries.`,
		})
	}

	if (incapable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `${capable.length > 0 ? 'However, it' : '**{{WALLET_NAME}}**'} does not support L2 force-inclusion withdrawal transactions on **${incapable
				.map(transactionSubmissionL2TypeName)
				.join(
					' or ',
				)}** L2s.\n\nThis means users rely on intermediaries in order to withdraw their funds from these L2s.`,
		})
	}

	switch (details.l1Broadcast) {
		case 'NO':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** does not support Ethereum peer-to-peer gossiping nor connecting to a user's self-hosted Ethereum node.\n\nTherefore, L1 transactions are subject to censorship by intermediaries.",
			})
			break
		case 'OWN_NODE':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports connecting to a user's self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries.",
			})
			break
		case 'SELF_GOSSIP':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports directly gossipping over Ethereum's peer-to-peer network, allowing L1 transactions to be reliably included without trusting intermediaries.",
			})
	}

	return blocks
}

/**
 * The summary sentence about a wallet's audit history.
 *
 * It is derived from the audits the model carries, so an aggregated
 * evaluation cannot claim one thing while listing evidence for another.
 */
export function securityAuditsSummary(details: SecurityAuditsDetails): string {
	const [mostRecent] = auditsByRecency(details)

	if (mostRecent === undefined) {
		return '**{{WALLET_NAME}}** has not undergone any security audits.'
	}

	const recency = auditedInLastYear(details) ? '.' : ', which was over a year ago.'
	const flaws = hasUnaddressedFlaws(details)
		? ' There remain unaddressed security flaws in the codebase.'
		: ''

	return `**{{WALLET_NAME}}** was last audited on ${formatCalendarDate(mostRecent.auditDate)}${recency}${flaws}`
}

/** How an audit's conclusion reads, whatever the adapter. */
export function securityAuditFindingsSentence(audit: SecurityAuditDetail): string {
	switch (audit.findings.kind) {
		case 'noneFound':
			return 'No security flaws of severity level medium or higher were found.'
		case 'allFixed':
			return 'All security flaws of severity level medium or higher were addressed.'
		case 'flaws':
			return audit.findings.flaws.every(flaw => flaw.status === 'FIXED')
				? 'The following security flaws were identified and have all been addressed since:'
				: 'The following security flaws were identified:'
	}
}

/** Human-readable label of a security flaw severity. */
export const securityFlawSeverityLabel: Record<SecurityFlawSeverity, string> = {
	[SecurityFlawSeverity.CRITICAL]: 'Critical',
	[SecurityFlawSeverity.HIGH]: 'High',
	[SecurityFlawSeverity.MEDIUM]: 'Medium',
}

/** What one part of the wallet being in scope reads as. */
function coverageBreadthDescription(breadth: CoverageBreadth): string {
	switch (breadth) {
		case CoverageBreadth.APP_ONLY:
			return 'the application layer'
		case CoverageBreadth.FIRMWARE_ONLY:
			return 'firmware vulnerabilities'
		case CoverageBreadth.HARDWARE_ONLY:
			return 'hardware vulnerabilities'
	}
}

/** The reward range of a bug bounty program, as a sentence. */
function bugBountyRewardsSentence(bounty: BugBountyDetail): string | null {
	if (bounty.rewards === undefined) {
		return null
	}

	const { minimum, maximum, currency } = bounty.rewards
	const symbol = currency === 'USD' ? '$' : ''
	const suffix = currency === 'USD' ? '' : ` ${currency}`
	const amount = (value: number): string => `${symbol}${value.toLocaleString('en-US')}`

	if (minimum !== undefined && maximum !== undefined) {
		return minimum === maximum
			? `Rewards are ${amount(minimum)}${suffix}`.trim()
			: `Rewards range from ${amount(minimum)} to ${amount(maximum)}${suffix}`.trim()
	}

	if (maximum !== undefined) {
		return `Rewards are up to ${amount(maximum)}${suffix}`.trim()
	}

	return minimum === undefined ? null : `Rewards start at ${amount(minimum)}${suffix}`.trim()
}

/**
 * Sentences describing a bug bounty program, in display order.
 *
 * Both visual adapters use these, so the web page and the exported Markdown
 * cannot describe the same program differently.
 */
export function bugBountySentences(bounty: BugBountyDetail): string[] {
	if (bounty.availability === 'NONE') {
		return [
			'**{{WALLET_NAME}}** does not implement a bug bounty program and does not provide a clear path for security researchers to report vulnerabilities. The wallet also lacks a documented process for providing security updates to address critical issues.',
		]
	}

	const sentences: string[] = []

	if (bounty.coverage === 'FULL_SCOPE') {
		sentences.push('The program covers all aspects of the wallet.')
	} else if (bounty.coverage.length > 0) {
		sentences.push(
			`The program covers only ${commaListFormat(bounty.coverage.map(coverageBreadthDescription))}.`,
		)
	}

	sentences.push(
		bounty.availability === BugBountyProgramAvailability.ACTIVE
			? 'The program is currently active and accepting vulnerability reports.'
			: 'Note that the program is currently inactive and not accepting new reports.',
	)

	if (bounty.platform !== undefined) {
		sentences.push(
			bounty.platform === BugBountyPlatform.SELF_HOSTED
				? 'The program is self-hosted.'
				: `The program is hosted on ${bounty.platform}.`,
		)
	}

	const rewards = bugBountyRewardsSentence(bounty)

	if (rewards !== null) {
		sentences.push(rewards)
	}

	if (bounty.legalProtection !== undefined) {
		const protectionType =
			bounty.legalProtection === LegalProtectionType.SAFE_HARBOR ? 'Safe Harbor' : 'Legal Assurance'

		sentences.push(
			`**Legal Protection**: The program provides ${protectionType} protections for security researchers conducting good faith security research.`,
		)
	}

	if (bounty.disclosureDays !== undefined) {
		sentences.push(`**Disclosure Process**: ${bounty.disclosureDays} days`)
	}

	sentences.push(
		bounty.upgradePathAvailable
			? 'Positively, the wallet does provide an upgrade path for users when security issues are identified.'
			: 'Unfortunately, the wallet does not provide a clear upgrade path for users when security issues are identified.',
	)

	return sentences
}

/** A block of guardian-policy prose, so each adapter formats lists natively. */
export type GuardianPolicyBlock =
	{ kind: 'paragraph'; text: string } | { kind: 'list'; lead: string; items: string[] }

/** Human-readable description of one guardian. */
function guardianLabel(guardian: Guardian): string {
	return guardianMarkdown(guardian)
}

function secretReconstitutionParagraph(
	reconstitution: 'CLIENT_SIDE' | Entity,
): GuardianPolicyBlock {
	return {
		kind: 'paragraph',
		text:
			reconstitution === 'CLIENT_SIDE'
				? 'The key is reconstituted **client-side**.'
				: `The key is reconstituted on infrastructure **owned by ${reconstitution.name}**.`,
	}
}

/**
 * Describe a guardian policy, block by block.
 *
 * Both account recovery and account unruggability show the same policy, so
 * this wording lives here rather than in either attribute.
 */
export function guardianPolicyBlocks(policy: GuardianPolicyDetail): GuardianPolicyBlock[] {
	const blocks: GuardianPolicyBlock[] = policy.description.map(text => ({
		kind: 'paragraph' as const,
		text,
	}))

	if (policy.facts.kind === 'secretSplit') {
		const {
			requiredGuardians,
			optionalGuardians,
			optionalGuardiansMinimumConfigurable,
			optionalGuardiansMinimumNeededForRecovery,
			secretReconstitution,
		} = policy.facts

		if (requiredGuardians.length > 0) {
			blocks.push(
				listOrSentence(
					'The recovery process **critically depends** on',
					requiredGuardians.map(guardianLabel),
				),
			)
		}

		// A wallet may require no optional guardian at all; saying so is more
		// useful than an empty list, which the previous helper threw on.
		blocks.push(
			optionalGuardians.length === 0
				? {
						kind: 'paragraph',
						text: 'The recovery process does not require setting up any other guardian.',
					}
				: listOrSentence(
						`The recovery process requires setting up recovery with at least ${optionalGuardiansMinimumConfigurable.toString()} of the following:`,
						optionalGuardians.map(guardianLabel),
					),
		)

		if (optionalGuardiansMinimumConfigurable !== optionalGuardiansMinimumNeededForRecovery) {
			blocks.push({
				kind: 'paragraph',
				text: `At least ${optionalGuardiansMinimumNeededForRecovery.toString()} of the above are required for recovery.`,
			})
		}

		blocks.push({
			kind: 'paragraph',
			text: `For evaluation purposes, Walletbeat assumes the user will use the policy requiring the _least amount of effort_ that the wallet allows, i.e. ${
				optionalGuardiansMinimumConfigurable === 1
					? 'a single recovery guardian'
					: `${optionalGuardiansMinimumConfigurable.toString()} recovery guardians`
			}.`,
		})
		blocks.push(secretReconstitutionParagraph(secretReconstitution))

		return blocks
	}

	const {
		configuredGuardians,
		requiredGuardians,
		timelockWarningSentByAllOf,
		minimumSignaturesWithTimelock,
		minimumSignaturesBypassTimelock,
	} = policy.facts

	blocks.push(
		listOrSentence(
			`Recovery requires the approval of at least ${minimumSignaturesWithTimelock.toString()} of the following guardians:`,
			configuredGuardians.map(guardianLabel),
		),
	)

	if (requiredGuardians.length > 0) {
		blocks.push(
			listOrSentence(
				'The recovery process **critically depends** on',
				requiredGuardians.map(guardianLabel),
			),
		)
	}

	blocks.push({
		kind: 'paragraph',
		text:
			minimumSignaturesBypassTimelock === minimumSignaturesWithTimelock
				? 'There is no way to bypass the timelock delay.'
				: `The timelock delay may be bypassed with the approval of at least ${minimumSignaturesBypassTimelock.toString()} guardians.`,
	})

	if (timelockWarningSentByAllOf.length > 0) {
		blocks.push({
			kind: 'paragraph',
			text: `During the timelock delay, the user is warned by ${commaListFormat(
				timelockWarningSentByAllOf.map(entity => `**${entity.name}**`),
			)}.`,
		})
	}

	return blocks
}

/** One item reads as a sentence; several read as a list. */
function listOrSentence(lead: string, items: string[]): GuardianPolicyBlock {
	const [first] = items

	if (items.length === 1 && first !== undefined) {
		const sentence = lead.endsWith(':') ? `${lead.slice(0, -1)}: ${first}.` : `${lead} ${first}.`

		return { kind: 'paragraph', text: sentence }
	}

	return { kind: 'list', lead: lead.endsWith(':') ? lead : `${lead} the following:`, items }
}

/** The sentence introducing a wallet's guardian-based account recovery. */
export function accountRecoverySummary(details: AccountRecoveryDetails): string {
	if (details.guardianPolicy === undefined) {
		return '{{WALLET_NAME}} does not implement guardian-based account recovery. The user will lose access to their account if they lose their seed phrase.'
	}

	const scenarios =
		details.unrecoverableScenarios.length === 0
			? 'passes all the tested scenarios.'
			: details.recoverableScenarios.length === 0
				? 'does not pass any of the tested scenarios.'
				: 'does not pass all the tested scenarios.'

	return `{{WALLET_NAME}} implements a Guardian-based account recovery feature which ${scenarios}`
}

/** The sentence introducing how ruggable a wallet's account recovery is. */
export function accountUnruggabilitySummary(details: AccountUnruggabilityDetails): string {
	if (details.guardianPolicy === undefined) {
		return 'Private key material never leaves {{WALLET_NAME}}, so no external entity may take over your account.'
	}

	const scenarios =
		details.takeoverScenarios.length === 0
			? 'passes all the tested scenarios'
			: details.safeScenarios.length === 0
				? 'does not pass any of the tested scenarios'
				: 'does not pass all the tested scenarios'

	return `{{WALLET_NAME}} implements a Guardian-based account recovery feature which ${scenarios} when it comes to anti-ruggability.`
}
