import { describe, expect, it } from 'vitest'

import { type Outcome, type OutcomeMetadata, Rating, Verifiability } from '@/schema/attributes'
import { type ComponentAndProps, sentence } from '@/types/content'
import type { AccountRecoveryDetailsContent } from '@/types/content/account-recovery-details'
import type { AccountUnruggabilityDetailsContent } from '@/types/content/account-unruggability-details'
import { evaluationDetailRenderData } from '@/types/content/evaluation-details'
import type { ScamAlertDetailsContent } from '@/types/content/scam-alert-details'
import type { SecurityAuditsDetailsContent } from '@/types/content/security-audits-details'

function outcomeWithMetadata<_Metadata extends object>(metadata: _Metadata) {
	return {
		id: 'test',
		displayName: 'Test outcome',
		shortExplanation: sentence('{{WALLET_NAME}} test outcome.'),
		rating: Rating.PASS,
		verifiability: Verifiability.SELF_EVIDENT,
		metadata,
	}
}

const outcomeWithoutMetadata: Outcome = {
	id: 'test',
	displayName: 'Test outcome',
	shortExplanation: sentence('{{WALLET_NAME}} test outcome.'),
	rating: Rating.PASS,
	verifiability: Verifiability.SELF_EVIDENT,
}

const _metadataRequirementByComponent = {
	AccountRecoveryDetails: 'bound',
	AccountUnruggabilityDetails: 'bound',
	AddressCorrelationDetails: 'unbound',
	ChainVerificationDetails: 'unbound',
	FundingDetails: 'unbound',
	PrivateTransfersDetails: 'unbound',
	ScamAlertDetails: 'bound',
	SecurityAuditsDetails: 'bound',
	TransactionInclusionDetails: 'unbound',
	UnratedAttribute: 'unbound',
} as const satisfies Record<ComponentAndProps['component'], 'bound' | 'unbound'>

type MetadataBoundComponentName = {
	[
		_Component in keyof typeof _metadataRequirementByComponent
	]: (typeof _metadataRequirementByComponent)[_Component] extends 'bound' ? _Component : never
}[keyof typeof _metadataRequirementByComponent]

type MetadataBoundTestCase<_Component extends MetadataBoundComponentName> = {
	details: Extract<ComponentAndProps, { component: _Component }>
	validOutcome: Outcome<OutcomeMetadata>
	incompatibleOutcome: Outcome<OutcomeMetadata>
}

const scamAlertDetails: ScamAlertDetailsContent = {
	component: 'ScamAlertDetails',
	componentProps: {},
}

const securityAuditsDetails: SecurityAuditsDetailsContent = {
	component: 'SecurityAuditsDetails',
	componentProps: {
		auditedInLastYear: false,
		hasUnaddressedFlaws: false,
		bugBountyDetails: '',
	},
}

const accountRecoveryDetails: AccountRecoveryDetailsContent = {
	component: 'AccountRecoveryDetails',
	componentProps: {},
}

const accountUnruggabilityDetails: AccountUnruggabilityDetailsContent = {
	component: 'AccountUnruggabilityDetails',
	componentProps: {},
}

const metadataBoundCases = {
	ScamAlertDetails: {
		details: scamAlertDetails,
		validOutcome: outcomeWithMetadata({ scamAlerts: null }),
		incompatibleOutcome: outcomeWithMetadata({ securityAudits: [] }),
	},
	SecurityAuditsDetails: {
		details: securityAuditsDetails,
		validOutcome: outcomeWithMetadata({ securityAudits: [] }),
		incompatibleOutcome: outcomeWithMetadata({ scamAlerts: null }),
	},
	AccountRecoveryDetails: {
		details: accountRecoveryDetails,
		validOutcome: outcomeWithMetadata({
			minimumGuardianPolicy: null,
			outcomes: null,
			drills: null,
		}),
		incompatibleOutcome: outcomeWithMetadata({
			minimumGuardianPolicy: null,
			outcomes: null,
		}),
	},
	AccountUnruggabilityDetails: {
		details: accountUnruggabilityDetails,
		validOutcome: outcomeWithMetadata({
			minimumGuardianPolicy: null,
			outcomes: null,
		}),
		incompatibleOutcome: outcomeWithMetadata({ securityAudits: [] }),
	},
} satisfies {
	[_Component in MetadataBoundComponentName]: MetadataBoundTestCase<_Component>
}

describe('evaluationDetailRenderData', () => {
	it.each(Object.values(metadataBoundCases))(
		'joins $details.component with its validated outcome',
		({ details, validOutcome }) => {
			const renderData = evaluationDetailRenderData(details, validOutcome)

			expect(renderData.component).toBe(details.component)
			expect(renderData.outcome).toBe(validOutcome)
		},
	)

	it.each(Object.values(metadataBoundCases))(
		'rejects missing outcome metadata for $details.component',
		({ details }) => {
			expect(() => evaluationDetailRenderData(details, outcomeWithoutMetadata)).toThrow(
				`Invalid outcome metadata for ${details.component}`,
			)
		},
	)

	it.each(Object.values(metadataBoundCases))(
		'rejects incompatible outcome metadata for $details.component',
		({ details, incompatibleOutcome }) => {
			expect(() => evaluationDetailRenderData(details, incompatibleOutcome)).toThrow(
				`Invalid outcome metadata for ${details.component}`,
			)
		},
	)
})
