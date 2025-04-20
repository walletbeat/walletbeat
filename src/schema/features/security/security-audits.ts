import type { NonEmptyArray } from '@/types/utils/non-empty'
import type { AtLeastOneTrueVariant } from '../../variants'
import type { MustRef } from '../../reference'
import type { CalendarDate } from '@/types/date'
import type { SecurityAuditor } from '../../entity'

/** The severity of a security flaw, as assigned by the security auditor. */
export enum SecurityFlawSeverity {
	CRITICAL = 'CRITICAL',
	HIGH = 'HIGH',
	MEDIUM = 'MEDIUM',

	// Lower-than-medium security flaws are not tracked.
	// If the security auditor does not assign a severity rating, use your
	// best judgement.
}

/** Human-friendly name for a security level. */
export function securityFlawSeverityName(severity: SecurityFlawSeverity): string {
	switch (severity) {
		case SecurityFlawSeverity.CRITICAL:
			return 'Critical'
		case SecurityFlawSeverity.HIGH:
			return 'High'
		case SecurityFlawSeverity.MEDIUM:
			return 'Medium'
	}
}

/** A security flaw which was not addressed at audit publication time. */
export type UnpatchedSecurityFlaw = {
	/** The name/description of the security flaw. */
	name: string

	/** The severity level of the security flaw. */
	severityAtAuditPublication: SecurityFlawSeverity
} & (
	| {
			/** The status of this flaw in the present day. */
			presentStatus: 'NOT_FIXED'
	  }
	| MustRef<{
			/**
			 * The status of this flaw in the present day.
			 * If a flaw was fixed after audit publication, it must come with a
			 * reference, such as a link to a code commit or to a statement or
			 * newer audit from the same auditor.
			 */
			presentStatus: 'FIXED'

			/** The date at which the flaw was fixed. */
			fixedDate: CalendarDate
	  }>
)

/**
 * A single security audit.
 * A URL to the audit report must be added as `ref`.
 */
export type SecurityAudit = MustRef<{
	/** The entity that performed the security audit. */
	auditor: SecurityAuditor

	/** The date the audit report was done or published. */
	auditDate: CalendarDate

	/**
	 * The snapshot of the code being audited, if provided in the report.
	 */
	codeSnapshot?: {
		/** When the snapshot of code was taken. */
		date: CalendarDate

		/** The commit hash of the code snapshot, if known. */
		commit?: string

		/** The release tag of the code snapshot, if known. */
		tag?: string
	}

	/**
	 * Which variants of the wallet were audited.
	 */
	variantsScope: AtLeastOneTrueVariant | 'ALL_VARIANTS'

	/**
	 * The set of security flaws that were found but not addressed by the time
	 * the audit was published.
	 *
	 * Only medium-severity or higher flaws are tracked.
	 *
	 * 'NONE_FOUND' means there were either no flaws found at all.
	 * 'ALL_FIXED' means that all flaws that were found by the auditor were
	 * either fixed by time the audit was published, or were of a lower
	 * severity than MEDIUM.
	 */
	unpatchedFlaws: 'NONE_FOUND' | 'ALL_FIXED' | NonEmptyArray<UnpatchedSecurityFlaw>
}>

/** Unique ID for a given security audit. */
export function securityAuditId(audit: SecurityAudit): string {
	return `${audit.auditor.id}-${audit.auditDate}`
}
