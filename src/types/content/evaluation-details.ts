import type { Outcome, OutcomeMetadata } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import type { ComponentAndProps } from '../content'
import type { AccountRecoveryDetailsContent } from './account-recovery-details'
import type { AccountUnruggabilityDetailsContent } from './account-unruggability-details'
import type { ScamAlertDetailsContent } from './scam-alert-details'
import type { SecurityAuditsDetailsContent } from './security-audits-details'

type MetadataBoundDetailsContent =
	| ScamAlertDetailsContent
	| SecurityAuditsDetailsContent
	| AccountRecoveryDetailsContent
	| AccountUnruggabilityDetailsContent

type UnboundEvaluationDetailRenderData<
	_DetailsContent extends ComponentAndProps = Exclude<
		ComponentAndProps,
		MetadataBoundDetailsContent
	>,
> = _DetailsContent extends ComponentAndProps
	? _DetailsContent & { outcome: Outcome<OutcomeMetadata> }
	: never

export type EvaluationDetailRenderData =
	| (ScamAlertDetailsContent & { outcome: Outcome<ScamPreventionMetadata> })
	| (SecurityAuditsDetailsContent & { outcome: Outcome<SecurityAuditsMetadata> })
	| (AccountRecoveryDetailsContent & { outcome: Outcome<AccountRecoveryMetadata> })
	| (AccountUnruggabilityDetailsContent & {
			outcome: Outcome<AccountUnruggabilityMetadata>
	  })
	| UnboundEvaluationDetailRenderData

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScamPreventionMetadata(value: unknown): value is ScamPreventionMetadata {
	if (!isRecord(value) || !Object.hasOwn(value, 'scamAlerts')) {
		return false
	}

	if (value.scamAlerts === null) {
		return true
	}

	return (
		isRecord(value.scamAlerts) &&
		isRecord(value.scamUrlWarning) &&
		isRecord(value.sendTransactionWarning) &&
		isRecord(value.contractTransactionWarning) &&
		isRecord(value.unlimitedApprovalWarning)
	)
}

function isSecurityAuditsMetadata(value: unknown): value is SecurityAuditsMetadata {
	return isRecord(value) && Array.isArray(value.securityAudits)
}

function isAccountRecoveryMetadata(value: unknown): value is AccountRecoveryMetadata {
	if (
		!isRecord(value) ||
		!Object.hasOwn(value, 'minimumGuardianPolicy') ||
		!Object.hasOwn(value, 'outcomes') ||
		!Object.hasOwn(value, 'drills')
	) {
		return false
	}

	const validGuardianPolicy =
		value.minimumGuardianPolicy === null || isRecord(value.minimumGuardianPolicy)
	const validOutcomes = value.outcomes === null || Array.isArray(value.outcomes)
	const validDrills =
		value.drills === null ||
		(isRecord(value.drills) &&
			Array.isArray(value.drills.configured) &&
			Array.isArray(value.drills.missing))

	return validGuardianPolicy && validOutcomes && validDrills
}

function isAccountUnruggabilityMetadata(value: unknown): value is AccountUnruggabilityMetadata {
	return (
		isRecord(value) &&
		Object.hasOwn(value, 'minimumGuardianPolicy') &&
		Object.hasOwn(value, 'outcomes') &&
		(value.minimumGuardianPolicy === null || isRecord(value.minimumGuardianPolicy)) &&
		(value.outcomes === null || Array.isArray(value.outcomes))
	)
}

function outcomeHasMetadata<_Metadata extends object>(
	outcome: Outcome<OutcomeMetadata>,
	isMetadata: (value: unknown) => value is _Metadata,
): outcome is Outcome<_Metadata> {
	return 'metadata' in outcome && isMetadata(outcome.metadata)
}

function requireOutcomeMetadata<_Metadata extends object>(
	componentName: MetadataBoundDetailsContent['component'],
	outcome: Outcome<OutcomeMetadata>,
	isMetadata: (value: unknown) => value is _Metadata,
): Outcome<_Metadata> {
	if (!outcomeHasMetadata(outcome, isMetadata)) {
		throw new Error(`Invalid outcome metadata for ${componentName}`)
	}

	return outcome
}

/**
 * Join baked custom-component props with the evaluation data injected while rendering.
 * Metadata checks live at this boundary because EvaluationTree intentionally stores
 * attributes with heterogeneous outcome metadata under a common type.
 */
export function evaluationDetailRenderData(
	details: ComponentAndProps,
	outcome: Outcome<OutcomeMetadata>,
): EvaluationDetailRenderData {
	switch (details.component) {
		case 'ScamAlertDetails':
			return {
				...details,
				outcome: requireOutcomeMetadata(details.component, outcome, isScamPreventionMetadata),
			}
		case 'SecurityAuditsDetails':
			return {
				...details,
				outcome: requireOutcomeMetadata(details.component, outcome, isSecurityAuditsMetadata),
			}
		case 'AccountRecoveryDetails':
			return {
				...details,
				outcome: requireOutcomeMetadata(details.component, outcome, isAccountRecoveryMetadata),
			}
		case 'AccountUnruggabilityDetails':
			return {
				...details,
				outcome: requireOutcomeMetadata(details.component, outcome, isAccountUnruggabilityMetadata),
			}
		case 'AddressCorrelationDetails':
		case 'ChainVerificationDetails':
		case 'FundingDetails':
		case 'PrivateTransfersDetails':
		case 'TransactionInclusionDetails':
		case 'UnratedAttribute':
			return { ...details, outcome }
	}
}
