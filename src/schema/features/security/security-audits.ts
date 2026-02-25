import type { CalendarDate } from '@/types/date'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import type { SecurityAuditor } from '../../entity'
import type { MustRef } from '../../reference'
import type { AtLeastOneTrueVariant } from '../../variants'

/**
 * Security audit data is fully researchable — no hands-on wallet testing needed.
 * To find audits: check the wallet's website security page, GitHub repository,
 * documentation, or blog. Audit reports are typically published as PDFs or links from the
 * wallet's documentation. Only list audits whose full report is PUBLICLY available.
 */

/**
 * The severity of a security flaw, as assigned by the auditor.
 * Only medium-severity or higher flaws are tracked here, lower-severity
 * findings are ignored.
 * 
 * If the security auditor does not assign a severity rating, use your best judgement.
 */
export enum SecurityFlawSeverity {
	CRITICAL = 'CRITICAL',
	HIGH = 'HIGH',
	MEDIUM = 'MEDIUM',

	// Lower-than-medium security flaws are not tracked.
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

/**
 * A security flaw that was unaddressed at the time the audit report was published.
 * To identify: read the audit report's findings section. For each medium-or-higher
 * finding marked as unresolved/acknowledged at publication, add an entry here.
 * Then check if the flaw was subsequently fixed and set `presentStatus` accordingly.
 */
export type UnpatchedSecurityFlaw = {
	/** Short name or description of the flaw, as used in the audit report. */
	name: string

	/**
	 * Severity as assigned by the auditor at publication time.
	 * If the auditor later revised the severity, use the original published value.
	 */
	severityAtAuditPublication: SecurityFlawSeverity
} & (
	| {
			/**
			 * The flaw remains unpatched as of today.
			 * To verify: check if the wallet's source code or a newer audit confirms
			 * the fix. If no evidence of a fix exists, use NOT_FIXED.
			 */
			presentStatus: 'NOT_FIXED'
	  }
	| MustRef<{
			/**
			 * The flaw was fixed after audit publication.
			 * The ref must link to evidence of the fix.
			 */
			presentStatus: 'FIXED'

			/** The date the fix was confirmed. */
			fixedDate: CalendarDate
	  }>
)

/**
 * A single public security audit.
 * The ref must link directly to the publicly available audit report (PDF or web page).
 * Only include audits whose full report is PUBLICLY accessible.
 */
export type SecurityAudit = MustRef<{
	/**
	 * The firm or individual that performed the audit.
	 * Must be an entity defined in the `SecurityAuditor` type.
	 */
	auditor: SecurityAuditor

	/**
	 * The date the audit report was published or delivered.
	 * To identify: look for a date on the report cover page or in its header.
	 */
	auditDate: CalendarDate

	/**
	 * The snapshot of code that was audited, if specified in the report.
	 * To identify: audit reports often include a "Scope" or "Target" section
	 * listing the commit hash or tag audited. Leave unset if not provided.
	 */
	codeSnapshot?: {
		/** When the code snapshot was taken, if stated in the report. */
		date: CalendarDate

		/** The git commit hash of the audited snapshot, if provided. */
		commit?: string

		/** The git release tag of the audited snapshot, if provided. */
		tag?: string
	}

	/**
	 * Which wallet variants were covered by this audit.
	 * Use `ALL_VARIANTS` if the audit covered the entire wallet codebase.
	 */
	variantsScope: AtLeastOneTrueVariant | 'ALL_VARIANTS'

	/**
	 * Security flaws found but not fixed by the time the report was published.
	 * Only medium-severity or higher findings are tracked.
	 *
	 * `NONE_FOUND`: no medium-or-higher flaws were found in the audit.
	 * `ALL_FIXED`: flaws were found but all were resolved before publication,
	 * or were below medium severity.
	 * An array: one entry per unresolved medium-or-higher finding at publication.
	 */
	unpatchedFlaws: 'NONE_FOUND' | 'ALL_FIXED' | NonEmptyArray<UnpatchedSecurityFlaw>
}>

/** Unique ID for a given security audit. */
export function securityAuditId(audit: SecurityAudit): string {
	return `${audit.auditor.id}-${audit.auditDate}`
}
