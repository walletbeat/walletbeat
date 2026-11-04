import { describe, expect, it } from 'vitest'

import {
	type SoftwareAttributeGroupId,
	softwareWalletAttributeTree,
	unratedSoftwareWallet,
} from '@/data/software-wallets'
import { allWalletLadders, WalletLadderType } from '@/schema/ladders'
import {
	evaluateWalletOnLadder,
	StageCriterionRating,
	type WalletLadder,
	type WalletStage,
} from '@/schema/stages'
import { WalletType } from '@/schema/wallet-types'
import { sentence } from '@/types/content'
import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import {
	getWalletStageAndLadder,
	walletQualifiesForStageZero,
	walletStageIndex,
} from '@/utils/stage'
import { allCriteriaInStage, computeCountsAndStatus } from '@/utils/stage-attributes'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

import { walletFixtures } from './browser/fixtures/wallet-fixtures'

function stage(
	id: WalletStage<SoftwareAttributeGroupId>['id'],
	ratings: NonEmptyArray<StageCriterionRating>,
): WalletStage<SoftwareAttributeGroupId> {
	return {
		id,
		label: id,
		name: 'Test stage',
		description: sentence('Stage requirements.'),
		criteriaGroups: [
			{
				id: 'requirements',
				description: sentence('Requirements.'),
				criteria: nonEmptyMap(ratings, (rating, index) => ({
					id: `criterion-${index}`,
					displayName: `Criterion ${index}`,
					description: sentence('A stage requirement.'),
					rationale: sentence('The requirement must be satisfied.'),
					evaluate: () =>
						rating === StageCriterionRating.UNRATED
							? { rating }
							: { rating, explanation: sentence('The criterion was evaluated.') },
				})),
			},
		],
	}
}

function ladder(
	stages: NonEmptyArray<WalletStage<SoftwareAttributeGroupId>>,
): WalletLadder<SoftwareAttributeGroupId> {
	return { stages, applicableTo: () => true }
}

describe('evaluateWalletOnLadder', () => {
	it('clears a stage whose criteria are all exempt', () => {
		const exempt = stage('stage:exempt', [StageCriterionRating.EXEMPT, StageCriterionRating.EXEMPT])

		expect(evaluateWalletOnLadder(unratedSoftwareWallet, ladder([exempt])).stage).toBe(exempt)
	})

	it.each([
		[StageCriterionRating.FAIL, 'QUALIFIED_FOR_NO_STAGES'],
		[StageCriterionRating.UNRATED, 'UNRATED'],
	] as const)('does not qualify for Stage 0 when the first stage is %s', (rating, expected) => {
		const first = stage('stage:first', [rating])
		const evaluation = evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first]))

		expect(evaluation.stage).toBe(expected)
		expect(evaluation.highestClearedStage).toBeNull()
		expect(
			walletQualifiesForStageZero({ ...unratedSoftwareWallet, ladders: { SOFTWARE: evaluation } }),
		).toBe(false)
	})

	it.each([StageCriterionRating.FAIL, StageCriterionRating.UNRATED])(
		'does not evaluate later stages after a reached stage is %s',
		rating => {
			const first = stage('stage:first', [rating])
			const unreachable = stage('stage:unreachable', [StageCriterionRating.PASS])

			unreachable.criteriaGroups[0].criteria[0].evaluate = () => {
				throw new Error('This criterion cannot be evaluated.')
			}

			expect(() =>
				evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, unreachable])),
			).not.toThrow()
		},
	)

	it('does not evaluate criteria on an inapplicable ladder', () => {
		const first = stage('stage:first', [StageCriterionRating.PASS])

		first.criteriaGroups[0].criteria[0].evaluate = () => {
			throw new Error('This criterion cannot be evaluated.')
		}

		expect(
			evaluateWalletOnLadder(unratedSoftwareWallet, {
				...ladder([first]),
				applicableTo: () => false,
			}),
		).toMatchObject({ stage: 'NOT_APPLICABLE', highestClearedStage: null })
	})

	it('keeps a definitive failure even when later stages are unknown', () => {
		const first = stage('stage:first', [StageCriterionRating.FAIL])
		const later = stage('stage:later', [StageCriterionRating.UNRATED])

		expect(evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, later])).stage).toBe(
			'QUALIFIED_FOR_NO_STAGES',
		)
	})

	it('preserves Stage 0 eligibility when the final ladder stage is unknown', () => {
		const first = stage('stage:first', [StageCriterionRating.PASS])
		const unknown = stage('stage:unknown', [StageCriterionRating.UNRATED])
		const evaluation = evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, unknown]))
		const wallet = { ...unratedSoftwareWallet, ladders: { SOFTWARE: evaluation } }

		expect(evaluation.stage).toBe('UNRATED')
		expect(walletQualifiesForStageZero(wallet)).toBe(true)
	})

	it.each([
		[StageCriterionRating.FAIL, StageCriterionRating.UNRATED],
		[StageCriterionRating.UNRATED, StageCriterionRating.FAIL],
	] as const)('retains the cleared stage when the next stage contains %s and %s', (a, b) => {
		const first = stage('stage:first', [StageCriterionRating.PASS])
		const failed = stage('stage:failed', [a, b])

		expect(evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, failed])).stage).toBe(first)
	})

	it('is unrated when a reached stage has unknown criteria and no failures', () => {
		const first = stage('stage:first', [StageCriterionRating.PASS])
		const unknown = stage('stage:unknown', [
			StageCriterionRating.PASS,
			StageCriterionRating.UNRATED,
		])

		expect(evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, unknown])).stage).toBe(
			'UNRATED',
		)
	})

	it('clears stages containing passing and exempt criteria', () => {
		const first = stage('stage:first', [StageCriterionRating.PASS, StageCriterionRating.EXEMPT])

		expect(evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first])).stage).toBe(first)
	})

	it('cannot skip a failed stage to qualify for a later stage', () => {
		const first = stage('stage:first', [StageCriterionRating.PASS])
		const failed = stage('stage:failed', [StageCriterionRating.FAIL])
		const later = stage('stage:later', [StageCriterionRating.PASS])

		expect(
			evaluateWalletOnLadder(unratedSoftwareWallet, ladder([first, failed, later])).stage,
		).toBe(first)
	})
})

describe('stage breakdowns', () => {
	it('includes an unrated label and later-stage requirements in Markdown', () => {
		const markdown = walletPageMarkdown(
			softwareWalletAttributeTree,
			unratedSoftwareWallet,
			'http://localhost:4321',
		)

		expect(markdown).toContain('Stage: Unrated')
		expect(markdown).toContain('### Stage 0')
		expect(markdown).toContain('### Stage 2')
	})

	it('exports an unknown rank explicitly while retaining later-stage breakdowns', () => {
		const payload = ratedWalletJsonExport(softwareWalletAttributeTree, unratedSoftwareWallet)

		expect(payload.stage).toBe('UNRATED')
		expect(payload.stageBreakdown?.map(item => item.stageId)).toEqual([
			'stage:software-0',
			'stage:software-0-5',
			'stage:software-1',
			'stage:software-2',
		])
	})

	it('reports an all-exempt stage as passing with no applicable criteria', () => {
		const exempt = stage('stage:exempt', [StageCriterionRating.EXEMPT])

		expect(computeCountsAndStatus(allCriteriaInStage(exempt), unratedSoftwareWallet)).toEqual({
			passedCount: 0,
			totalCount: 0,
			status: 'PASS',
		})
	})
})

describe('stage selection by assigned wallet type', () => {
	it('keeps software ranking distinct from a hardware type with no applicable ladder', () => {
		const wallet = walletFixtures.multipleTypes()
		const software = getWalletStageAndLadder(wallet, WalletType.SOFTWARE)
		const hardware = getWalletStageAndLadder(wallet, WalletType.HARDWARE)

		expect(software.ladderEvaluation).not.toBeNull()
		expect(hardware.ladderEvaluation).toBeNull()
		expect(getWalletStageAndLadder(wallet)).toEqual(software)
		expect(getWalletStageAndLadder(wallet, WalletType.EMBEDDED).ladderEvaluation).toBeNull()
	})
	it('retains the ladder when its criteria are unknown and omits absent ladders', () => {
		expect(getWalletStageAndLadder(walletFixtures.unknown()).ladderEvaluation).not.toBeNull()
		expect(getWalletStageAndLadder(walletFixtures.embedded()).ladderEvaluation).toBeNull()
	})
})

describe('reported stage ordering', () => {
	it.each([
		['ascending', 1],
		['descending', -1],
	] as const)('orders states without a stage and every ladder stage %s', (_direction, sign) => {
		const softwareLadder = allWalletLadders[WalletLadderType.SOFTWARE]
		const ranked = softwareLadder.stages.map(stage => ({
			...walletFixtures.software(),
			ladders: {
				[WalletLadderType.SOFTWARE]: {
					ladder: softwareLadder,
					stage,
					highestClearedStage: stage,
				},
			},
		}))
		const withoutStage = [
			walletFixtures.stageNoneCleared(),
			walletFixtures.stageUnknown(),
			walletFixtures.stageUnknownAfterClear(),
		]
		const mixed = [...ranked, ...withoutStage].toReversed()
		const ordered = mixed.toSorted(
			(a, b) => sign * ((walletStageIndex(a) ?? -1) - (walletStageIndex(b) ?? -1)),
		)
		const expected = [
			...withoutStage.map(() => -1),
			...softwareLadder.stages.map((_, index) => index),
		]

		expect(ordered.map(walletStageIndex)).toEqual(sign === 1 ? expected : expected.toReversed())
		expect(withoutStage.map(wallet => getWalletStageAndLadder(wallet).stage)).toEqual([
			'QUALIFIED_FOR_NO_STAGES',
			'UNRATED',
			'UNRATED',
		])
		expect(withoutStage.map(walletQualifiesForStageZero)).toEqual([false, false, true])
	})

	it('omits an absent ladder without treating unknown evidence as absent', () => {
		expect(walletStageIndex(walletFixtures.embedded())).toBeUndefined()
		expect(walletStageIndex(walletFixtures.stageUnknown())).toBe(-1)
		expect(walletStageIndex(walletFixtures.stageNoneCleared())).toBe(-1)
	})
})
