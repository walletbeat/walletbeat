import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import {
	securityAuditsAndBounties,
	type SecurityAuditsMetadata,
} from '@/schema/attributes/security/security-audits-bounties'
import { securityAuditId } from '@/schema/features/security/security-audits'
import { Variant } from '@/schema/variants'
import type { RatedWallet, ResolvedWallet } from '@/schema/wallet'
import { isSecurityAuditsMetadata } from '@/types/content/security-audits-details'
import { nonEmptyValues } from '@/types/utils/non-empty'

function isSecurityAuditsEvaluation<_Evaluation extends Evaluation<OutcomeMetadata>>(
	evaluation: _Evaluation,
): evaluation is _Evaluation & Evaluation<SecurityAuditsMetadata> {
	return isSecurityAuditsMetadata(evaluation.outcome.metadata)
}

function auditIds(evaluation: Evaluation<OutcomeMetadata> | undefined): string[] {
	const metadata = evaluation?.outcome.metadata
	const audits = isSecurityAuditsMetadata(metadata) ? metadata.securityAudits : []

	return audits.map(securityAuditId).sort()
}

function variantAuditsEvaluation(
	resolved: ResolvedWallet<string>,
): Evaluation<OutcomeMetadata> | undefined {
	return resolved.attributes.security?.securityAuditsAndBounties?.evaluation
}

describe('securityAuditsAndBounties aggregate', () => {
	for (const [walletName, wallet] of Object.entries(allRatedWallets) as Array<
		[string, RatedWallet<string>]
	>) {
		const variants = nonEmptyValues<Variant, ResolvedWallet<string>>(wallet.variants)

		if (variants.length < 2) {
			continue
		}

		it(`keeps per-variant audit lists of ${walletName} scoped to their variant`, () => {
			const allIds = new Set<string>()

			for (const resolved of variants) {
				const expectedIds = (resolved.features.security.publicSecurityAudits ?? [])
					.map(securityAuditId)
					.sort()
				const evaluation = variantAuditsEvaluation(resolved)

				if (evaluation === undefined) {
					continue
				}

				expect(auditIds(evaluation), `variant ${resolved.variant}`).toEqual(expectedIds)

				for (const id of expectedIds) {
					allIds.add(id)
				}
			}

			const overall = wallet.overall.security?.securityAuditsAndBounties?.evaluation

			if (overall !== undefined) {
				expect(auditIds(overall)).toEqual([...allIds].sort())
			}
		})
	}

	it('does not apply browser-only audits to Phantom mobile', () => {
		const { phantom } = allRatedWallets
		const mobile = phantom.variants[Variant.MOBILE]
		const browser = phantom.variants[Variant.BROWSER]

		expect(mobile).toBeDefined()
		expect(browser).toBeDefined()

		const browserOnlyIds = (browser?.features.security.publicSecurityAudits ?? [])
			.filter(audit => audit.variantsScope !== 'ALL_VARIANTS')
			.map(securityAuditId)

		expect(browserOnlyIds.length).toBeGreaterThan(0)

		const mobileIds = auditIds(mobile === undefined ? undefined : variantAuditsEvaluation(mobile))
		const overallIds = auditIds(phantom.overall.security.securityAuditsAndBounties.evaluation)

		for (const id of browserOnlyIds) {
			expect(mobileIds).not.toContain(id)
			expect(overallIds).toContain(id)
		}
	})

	it('does not mutate the per-variant evaluations it aggregates', () => {
		const { phantom } = allRatedWallets
		const mobile = phantom.variants[Variant.MOBILE]
		const browser = phantom.variants[Variant.BROWSER]

		if (mobile === undefined || browser === undefined) {
			throw new Error('Phantom must have mobile and browser variants')
		}

		const mobileEvaluation = variantAuditsEvaluation(mobile)
		const browserEvaluation = variantAuditsEvaluation(browser)

		if (
			mobileEvaluation === undefined ||
			browserEvaluation === undefined ||
			!isSecurityAuditsEvaluation(mobileEvaluation) ||
			!isSecurityAuditsEvaluation(browserEvaluation)
		) {
			throw new Error('Phantom must have security audit evaluations')
		}

		const mobileMetadataBefore = mobileEvaluation.outcome.metadata
		const browserMetadataBefore = browserEvaluation.outcome.metadata
		const aggregated = securityAuditsAndBounties.aggregate({
			[Variant.MOBILE]: mobileEvaluation,
			[Variant.BROWSER]: browserEvaluation,
		})

		expect(mobileEvaluation.outcome.metadata).toBe(mobileMetadataBefore)
		expect(browserEvaluation.outcome.metadata).toBe(browserMetadataBefore)
		expect(aggregated).not.toBe(mobileEvaluation)
		expect(aggregated).not.toBe(browserEvaluation)
	})
})
