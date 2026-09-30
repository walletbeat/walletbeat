import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { unratedSoftwareWallet } from '@/data/software-wallets'
import { evaluateWalletOnLadder, StageCriterionRating } from '@/schema/stages'
import { softwareWalletStageZero } from '@/schema/stages/software-wallet-stages'
import { sentence } from '@/types/content'
import { getWalletStageAndLadder } from '@/utils/stage'
import WalletStageBadge from '@/views/WalletStageBadge.svelte'
import WalletStageOverview from '@/views/WalletStageOverview.svelte'
import WalletStageSummary from '@/views/WalletStageSummary.svelte'

describe('wallet stage display', () => {
	it('renders all-exempt stage and group breakdowns without a zero denominator', () => {
		const exemptStage = {
			...softwareWalletStageZero,
			criteriaGroups: [
				{
					...softwareWalletStageZero.criteriaGroups[0],
					criteria: [
						{
							...softwareWalletStageZero.criteriaGroups[0].criteria[0],
							evaluate: () => ({
								rating: StageCriterionRating.EXEMPT,
								explanation: sentence('The requirement does not apply.'),
							}),
						},
					],
				},
			],
		} satisfies typeof softwareWalletStageZero
		const evaluation = evaluateWalletOnLadder(unratedSoftwareWallet, {
			stages: [exemptStage],
			applicableTo: () => true,
		})
		const { body } = render(WalletStageOverview, {
			props: {
				wallet: unratedSoftwareWallet,
				stage: evaluation.stage,
				ladderEvaluation: evaluation,
			},
		})

		expect(body).toContain('value="PASS"')
		expect(body).not.toContain('0/0')
	})

	it('keeps unresolved requirements visible in an unrated summary', () => {
		const { stage, ladderEvaluation } = getWalletStageAndLadder(unratedSoftwareWallet)
		const { body } = render(WalletStageSummary, {
			props: { wallet: unratedSoftwareWallet, stage, ladderEvaluation },
		})

		expect(body).toContain('Unrated')
		expect(body).toContain('source code')
	})

	it('shows an unrated badge for an unknown ladder rank', () => {
		const { stage, ladderEvaluation } = getWalletStageAndLadder(unratedSoftwareWallet)
		const { body } = render(WalletStageBadge, { props: { stage, ladderEvaluation } })

		expect(body).toContain('Unrated')
		expect(body).toContain('value="UNRATED"')
	})
})
