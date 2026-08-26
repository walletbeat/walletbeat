import type { SecurityAuditor } from '@/schema/entity'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import type { FullyQualifiedReference } from '@/schema/reference'
import { type Variant, variantLabel } from '@/schema/variants'
import type { CalendarDate } from '@/types/date'
import { daysSince } from '@/types/date'
import type { NonEmptyArray } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'

export interface SecurityAuditFlaw {
	name: string
	severity: SecurityFlawSeverity
	status: 'FIXED' | 'NOT_FIXED'
}

export type SecurityAuditFindings =
	| { kind: 'noneFound' }
	| { kind: 'allFixed' }
	| { kind: 'flaws'; flaws: NonEmptyArray<SecurityAuditFlaw> }

export interface SecurityAuditDetail {
	auditor: SecurityAuditor
	auditDate: CalendarDate

	/**
	 * Which variants the audit covered. Aggregated evaluations show audits from
	 * several variants, so each audit states its own scope rather than being
	 * presented as covering the whole wallet.
	 */
	variants: Variant[] | 'ALL_VARIANTS'
	findings: SecurityAuditFindings
	references: FullyQualifiedReference[]
}

export function auditVariantNames(audit: SecurityAuditDetail): string[] {
	return audit.variants === 'ALL_VARIANTS' ? [] : audit.variants.map(variantLabel)
}

export interface BugBountyDetail {
	/** `NONE` when the wallet runs no program at all. */
	availability: BugBountyProgramAvailability | 'NONE'

	/** `FULL_SCOPE`, or the specific parts of the wallet that are in scope. */
	coverage: 'FULL_SCOPE' | CoverageBreadth[]
	platform?: BugBountyPlatform
	rewards?: { minimum?: number; maximum?: number; currency: string }
	legalProtection?: LegalProtectionType
	disclosureDays?: number
	upgradePathAvailable: boolean
	references: FullyQualifiedReference[]
}

export interface SecurityAuditsDetails {
	type: 'securityAudits'
	audits: SecurityAuditDetail[]
	bugBounty?: BugBountyDetail
}

export function isSecurityAuditsDetails(details: unknown): details is SecurityAuditsDetails {
	return (
		typeof details === 'object' &&
		details !== null &&
		'type' in details &&
		details.type === 'securityAudits'
	)
}

export function auditsByRecency(details: SecurityAuditsDetails): SecurityAuditDetail[] {
	return details.audits.toSorted((left, right) => right.auditDate.localeCompare(left.auditDate))
}

export function auditedInLastYear(details: SecurityAuditsDetails): boolean {
	return details.audits.some(audit => daysSince(audit.auditDate) <= 366)
}

export function hasUnaddressedFlaws(details: SecurityAuditsDetails): boolean {
	return details.audits.some(
		audit =>
			audit.findings.kind === 'flaws' &&
			audit.findings.flaws.some(flaw => flaw.status === 'NOT_FIXED'),
	)
}

/**
 * Format a calendar date without ever crossing a day boundary.
 *
 * `new Date('YYYY-MM-DD')` parses as UTC midnight, so formatting it in a
 * local time zone west of UTC shows the previous day. Formatting in UTC keeps
 * the authored date.
 */
export function formatCalendarDate(date: CalendarDate): string {
	return Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
		new Date(`${date}T00:00:00Z`),
	)
}

/** Merge audit evidence from several evaluations, keeping each audit once. */
export function mergeSecurityAuditsDetails(
	details: SecurityAuditsDetails,
	others: SecurityAuditsDetails[],
): SecurityAuditsDetails {
	const audits = [...details.audits]
	const seen = new Set(audits.map(auditKey))

	for (const other of others) {
		for (const audit of other.audits) {
			if (!seen.has(auditKey(audit))) {
				seen.add(auditKey(audit))
				audits.push(audit)
			}
		}
	}

	return { ...details, audits }
}

function auditKey(audit: SecurityAuditDetail): string {
	return `${audit.auditor.id}-${audit.auditDate}`
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

export const securityFlawSeverityLabel: Record<SecurityFlawSeverity, string> = {
	[SecurityFlawSeverity.CRITICAL]: 'Critical',
	[SecurityFlawSeverity.HIGH]: 'High',
	[SecurityFlawSeverity.MEDIUM]: 'Medium',
}

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
