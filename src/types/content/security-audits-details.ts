import type { SecurityAuditor } from '@/schema/entity'
import type {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import type { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import type { FullyQualifiedReference } from '@/schema/reference'
import { type Variant, variantLabel } from '@/schema/variants'
import type { CalendarDate } from '@/types/date'
import { daysSince } from '@/types/date'
import type { NonEmptyArray } from '@/types/utils/non-empty'

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
