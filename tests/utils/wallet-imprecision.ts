import { type AttributeTree, calculateOverallScore } from '@/schema/attribute-groups'
import { defaultRatingScore, Rating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'
import type { RatedWallet } from '@/schema/wallet'
import { walletStageIndex } from '@/utils/stage'

export interface ScoreInterval {
	min: number
	max: number
}

export interface RankedWalletInterval {
	id: string
	interval: ScoreInterval
	score: number
	stageIndex: number
	sourceIndex: number
}

export interface WeightedOutcomeScore {
	rating: Rating
	score: number | null
	weight: number
}

export function weightedScoreInterval(outcomes: WeightedOutcomeScore[]): ScoreInterval {
	const weightedIntervals = outcomes.flatMap(({ rating, score, weight }) => {
		if (rating === Rating.EXEMPT) {
			return []
		}

		if (rating === Rating.UNRATED) {
			return [{ min: 0, max: 1, weight }]
		}

		return score === null ? [] : [{ min: score, max: score, weight }]
	})
	const totalWeight = weightedIntervals.reduce((sum, interval) => sum + interval.weight, 0)

	if (totalWeight === 0) {
		return { min: 0, max: 0 }
	}

	return {
		min:
			weightedIntervals.reduce((sum, interval) => sum + interval.min * interval.weight, 0) /
			totalWeight,
		max:
			weightedIntervals.reduce((sum, interval) => sum + interval.max * interval.weight, 0) /
			totalWeight,
	}
}

function walletTableAttributeGroupIds<_AttributeGroupId extends string>(
	wallets: RatedWallet<_AttributeGroupId>[],
	attributeTree: AttributeTree<_AttributeGroupId>,
): Set<_AttributeGroupId> {
	const representative = wallets.find(
		wallet =>
			wallet.variants[Variant.BROWSER] ||
			wallet.variants[Variant.DESKTOP] ||
			wallet.variants[Variant.MOBILE],
	)

	if (representative === undefined) {
		return new Set(Object.values(attributeTree).map(group => group.id))
	}

	return new Set(
		Object.values(attributeTree)
			.filter(group =>
				group.attributes.some(
					({ attribute }) =>
						representative.overall[group.id]?.[attribute.id]?.evaluation.outcome.rating !==
						Rating.EXEMPT,
				),
			)
			.map(group => group.id),
	)
}

function calculateWalletScoreInterval<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
	attributeTree: AttributeTree<_AttributeGroupId>,
	displayedGroupIds: ReadonlySet<_AttributeGroupId>,
): ScoreInterval {
	const groupIntervals: ScoreInterval[] = []

	for (const group of Object.values(attributeTree)) {
		if (!displayedGroupIds.has(group.id)) {
			continue
		}

		const evaluatedGroup = wallet.overall[group.id]

		if (
			evaluatedGroup === undefined ||
			Object.values(evaluatedGroup).every(
				evaluation => evaluation.evaluation.outcome.rating === Rating.EXEMPT,
			)
		) {
			continue
		}

		const weightedOutcomes: WeightedOutcomeScore[] = []

		for (const { attribute, weight } of group.attributes) {
			const evaluation = evaluatedGroup[attribute.id]

			if (evaluation === undefined) {
				throw new Error(`Missing evaluation for ${group.id}.${attribute.id}`)
			}

			const outcome = evaluation.evaluation.outcome

			if (outcome.rating === Rating.EXEMPT) {
				continue
			}

			if (outcome.rating === Rating.UNRATED) {
				weightedOutcomes.push({ rating: outcome.rating, score: null, weight })
				continue
			}

			const score = outcome.score ?? defaultRatingScore(outcome)

			weightedOutcomes.push({ rating: outcome.rating, score, weight })
		}

		groupIntervals.push(weightedScoreInterval(weightedOutcomes))
	}

	if (groupIntervals.length === 0) {
		return { min: 0, max: 0 }
	}

	return {
		min: groupIntervals.reduce((sum, interval) => sum + interval.min, 0) / groupIntervals.length,
		max: groupIntervals.reduce((sum, interval) => sum + interval.max, 0) / groupIntervals.length,
	}
}

function rankPosition(
	candidate: RankedWalletInterval,
	score: number,
	previouslyIncluded: RankedWalletInterval[],
): number {
	return previouslyIncluded.filter(other => {
		if (other.stageIndex !== candidate.stageIndex) {
			return other.stageIndex > candidate.stageIndex
		}

		if (other.score !== score) {
			return other.score > score
		}

		return other.sourceIndex < candidate.sourceIndex
	}).length
}

export function impreciseWalletIds<_AttributeGroupId extends string>(
	wallets: RatedWallet<_AttributeGroupId>[],
	attributeTree: AttributeTree<_AttributeGroupId>,
): Set<string> {
	const displayedGroupIds = walletTableAttributeGroupIds(wallets, attributeTree)
	const candidates = wallets.map((wallet, sourceIndex): RankedWalletInterval => {
		const interval = calculateWalletScoreInterval(wallet, attributeTree, displayedGroupIds)
		const overallScore = calculateOverallScore(attributeTree, wallet.overall, group =>
			displayedGroupIds.has(group.id),
		)

		return {
			id: wallet.metadata.id,
			interval,
			score: overallScore?.score ?? 0,
			stageIndex: walletStageIndex(wallet),
			sourceIndex,
		}
	})

	return impreciseWalletIdsFromScoreIntervals(candidates)
}

export function impreciseWalletIdsFromScoreIntervals(entries: RankedWalletInterval[]): Set<string> {
	const ordered = entries.toSorted(
		(a, b) =>
			a.interval.max - a.interval.min - (b.interval.max - b.interval.min) ||
			a.sourceIndex - b.sourceIndex,
	)
	const included: RankedWalletInterval[] = []
	const imprecise = new Set<string>()

	for (const candidate of ordered) {
		const minPosition = rankPosition(candidate, candidate.interval.min, included)
		const maxPosition = rankPosition(candidate, candidate.interval.max, included)

		if (Math.abs(maxPosition - minPosition) > 3) {
			imprecise.add(candidate.id)
		} else {
			included.push(candidate)
		}
	}

	return imprecise
}
