import type { Outcome, OutcomeMetadata } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import type { ComponentAndProps } from '../content'
import {
	type AccountRecoveryDetailsContent,
	isAccountRecoveryMetadata,
} from './account-recovery-details'
import {
	type AccountUnruggabilityDetailsContent,
	isAccountUnruggabilityMetadata,
} from './account-unruggability-details'
import { isScamPreventionMetadata, type ScamAlertDetailsContent } from './scam-alert-details'
import {
	isSecurityAuditsMetadata,
	type SecurityAuditsDetailsContent,
} from './security-audits-details'

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
 * EvaluationTree intentionally stores attributes with heterogeneous outcome metadata
 * under a common type. Outcomes originate from statically typed internal evaluations;
 * these guards restore the component/outcome correlation erased at that boundary, not
 * validate untrusted input.
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
