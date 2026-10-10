import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import { securityAuditId } from '@/schema/features/security/security-audits'
import { Variant } from '@/schema/variants'
import type { RatedWallet, ResolvedWallet } from '@/schema/wallet'
import { isSecurityAuditsMetadata } from '@/types/content/security-audits-details'
import { nonEmptyValues } from '@/types/utils/non-empty'

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
})
