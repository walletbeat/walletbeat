import { describe, expect, it } from 'vitest'

import { type Outcome, Rating, Verifiability } from '@/schema/attributes'
import { sentence } from '@/types/content'
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

describe('evaluationDetailRenderData', () => {
	it.each([
		{
			details: scamAlertDetails,
			outcome: outcomeWithMetadata({ scamAlerts: null }),
		},
		{
			details: securityAuditsDetails,
			outcome: outcomeWithMetadata({ securityAudits: [] }),
		},
		{
			details: accountRecoveryDetails,
			outcome: outcomeWithMetadata({
				minimumGuardianPolicy: null,
				outcomes: null,
				drills: null,
			}),
		},
		{
			details: accountUnruggabilityDetails,
			outcome: outcomeWithMetadata({
				minimumGuardianPolicy: null,
				outcomes: null,
			}),
		},
	])('joins $details.component with its validated outcome', ({ details, outcome }) => {
		const renderData = evaluationDetailRenderData(details, outcome)

		expect(renderData.component).toBe(details.component)
		expect(renderData.outcome).toBe(outcome)
	})

	it.each([
		scamAlertDetails,
		securityAuditsDetails,
		accountRecoveryDetails,
		accountUnruggabilityDetails,
	])('rejects missing outcome metadata for $component', details => {
		expect(() => evaluationDetailRenderData(details, outcomeWithoutMetadata)).toThrow(
			`Invalid outcome metadata for ${details.component}`,
		)
	})

	it.each([
		{
			details: scamAlertDetails,
			outcome: outcomeWithMetadata({ securityAudits: [] }),
		},
		{
			details: securityAuditsDetails,
			outcome: outcomeWithMetadata({ scamAlerts: null }),
		},
		{
			details: accountRecoveryDetails,
			outcome: outcomeWithMetadata({
				minimumGuardianPolicy: null,
				outcomes: null,
			}),
		},
		{
			details: accountUnruggabilityDetails,
			outcome: outcomeWithMetadata({ securityAudits: [] }),
		},
	])('rejects incompatible outcome metadata for $details.component', ({ details, outcome }) => {
		expect(() => evaluationDetailRenderData(details, outcome)).toThrow(
			`Invalid outcome metadata for ${details.component}`,
		)
	})
})
