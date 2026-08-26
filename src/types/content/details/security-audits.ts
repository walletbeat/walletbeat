import type { SecurityAuditor } from '@/schema/entity'
import type {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import type { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import type { FullyQualifiedReference } from '@/schema/reference'
import type { CalendarDate } from '@/types/date'
import { daysSince } from '@/types/date'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/** One flaw an audit found, and whether it has been fixed since. */
export interface SecurityAuditFlaw {
	name: string
	severity: SecurityFlawSeverity
	status: 'FIXED' | 'NOT_FIXED'
}

/** What an audit concluded. */
export type SecurityAuditFindings =
	| { kind: 'noneFound' }
	| { kind: 'allFixed' }
	| { kind: 'flaws'; flaws: NonEmptyArray<SecurityAuditFlaw> }

/** Evidence from one security audit. */
export interface SecurityAuditDetail {
	auditor: SecurityAuditor
	auditDate: CalendarDate
	findings: SecurityAuditFindings
	references: FullyQualifiedReference[]
}

/** The state of a wallet's bug bounty program. */
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

/**
 * Canonical detail model for security audits and bug bounties.
 *
 * Audits are the evidence; the summary an adapter shows (when the wallet was
 * last audited, whether flaws remain) is derived from these same audits rather
 * than stored separately. That is what keeps an aggregated evaluation honest:
 * merging the audits of several variants also updates the summary, instead of
 * pairing every variant's evidence with the worst variant's assessment.
 */
export interface SecurityAuditsDetails {
	type: 'securityAudits'
	audits: SecurityAuditDetail[]
	bugBounty?: BugBountyDetail
}

/** Type predicate for security audit details. */
export function isSecurityAuditsDetails(details: unknown): details is SecurityAuditsDetails {
	return (
		typeof details === 'object' &&
		details !== null &&
		'type' in details &&
		details.type === 'securityAudits'
	)
}

/** Audits, most recent first. */
export function auditsByRecency(details: SecurityAuditsDetails): SecurityAuditDetail[] {
	return details.audits.toSorted((left, right) => right.auditDate.localeCompare(left.auditDate))
}

/** Whether at least one audit happened within the last year. */
export function auditedInLastYear(details: SecurityAuditsDetails): boolean {
	return details.audits.some(audit => daysSince(audit.auditDate) <= 366)
}

/** Whether any audit found a flaw that is still not fixed. */
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
