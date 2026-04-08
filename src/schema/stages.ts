import { attributeGroupById } from '@/data/attribute-groups'
import { type Content, type Paragraph, type Sentence, sentence } from '@/types/content'
import { getErrorMessage } from '@/types/errors'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyFlatten,
	nonEmptyGet,
	nonEmptyMap,
	type NonEmptySet,
	setItems,
} from '@/types/utils/non-empty'

import { getAttributeFromTree } from './attribute-groups'
import {
	type Attribute,
	type OutcomeMetadata,
	Rating,
	Verifiability,
	type WalletNameStrings,
} from './attributes'
import type { Variant } from './variants'
import { type RatedWallet, type ResolvedWallet } from './wallet'

/**
 * StageEvaluatableWallet is a RatedWallet object for which we omit metadata
 * information (because the stage rating process should not take this into
 * account), and stage rating information (because the purpose of this type
 * is to populate that).
 */
export type StageEvaluatableWallet<_AttributeGroupId extends string> = Omit<
	RatedWallet<_AttributeGroupId>,
	'metadata' | 'ladders' | 'stagesByType'
>

/**
 * Whether a given wallet passes or fails a stage-specific criterion.
 * Unlike attribute ratings, this cannot be PARTIAL.
 * This is strictly PASS/FAIL.
 */
export enum StageCriterionRating {
	/** The wallet meets this stage criterion. */
	PASS = 'PASS',

	/** The wallet does not meet this stage criterion. */
	FAIL = 'FAIL',

	/** The wallet is exempt from this stage. */
	EXEMPT = 'EXEMPT',

	/**
	 * The wallet cannot be rated on this stage criterion, because the
	 * necessary data to make this call is not populated.
	 */
	UNRATED = 'UNRATED',
}

export const stageCriterionRatings = {
	[StageCriterionRating.PASS]: {
		icon: '✅',
		label: 'Criterion passed',
		color: 'var(--rating-pass)',
	},
	[StageCriterionRating.FAIL]: {
		icon: '❌',
		label: 'Criterion failed',
		color: 'var(--rating-fail)',
	},
	[StageCriterionRating.EXEMPT]: {
		icon: '➖',
		label: 'Criterion exempt',
		color: 'var(--rating-exempt)',
	},
	[StageCriterionRating.UNRATED]: {
		icon: '❔',
		label: 'Criterion unrated',
		color: 'var(--rating-unrated)',
	},
} as const satisfies Record<
	StageCriterionRating,
	{
		icon: string
		label: string
		color: string
	}
>

/**
 * The result of evaluating one specific stage criterion for one specific
 * wallet.
 */
export type StageCriterionEvaluation = {
	/** The rating of this criterion. */
	rating: StageCriterionRating
} & (
	| {
			// If not unrated, the explanation must be provided.
			rating: Omit<StageCriterionRating, StageCriterionRating.UNRATED>

			/** Explanation of the rating. */
			explanation: Sentence<WalletNameStrings>
	  }
	| {
			// If unrated, the explanation is not required.
			rating: StageCriterionRating.UNRATED
	  }
)

/**
 * A single criterion for a wallet stage.
 */
export interface WalletStageCriterion<_AttributeGroupId extends string> {
	/** An ID for this criterion. */
	id: string

	/** What the criterion looks for. */
	description: Paragraph

	/** Human-readable name for this criterion. */
	displayName: string

	/** Why this criterion is important and part of this stage. */
	rationale: Paragraph

	/** Evaluate a wallet for this given criterion. */
	evaluate: (wallet: StageEvaluatableWallet<_AttributeGroupId>) => StageCriterionEvaluation
}

type StageCriterionEvaluateFn = (wallet: StageEvaluatableWallet<string>) => StageCriterionEvaluation

/** Map of evaluate functions to their associated attribute IDs. */
const evaluateFunctionAttributeIds = new WeakMap<StageCriterionEvaluateFn, string>()

/** Get the attribute ID associated with an evaluate function, if any. */
export const getEvaluateFunctionAttributeId = <_AttributeGroupId extends string>(
	evaluate: WalletStageCriterion<_AttributeGroupId>['evaluate'],
): string | null => evaluateFunctionAttributeIds.get(evaluate) ?? null

/**
 * A logical criteria group for a wallet stage.
 */
export interface WalletStageGroup<_AttributeGroupId extends string> {
	/** An ID for this criteria group. */
	id: string

	/** What the criteria group looks for. */
	description: Paragraph

	/**
	 * The criteria for this criteria group.
	 * Wallets must `PASS` all of these criteria in order to pass the
	 * criteria group.
	 */
	criteria: NonEmptyArray<WalletStageCriterion<_AttributeGroupId>>
}

/**
 * A wallet stage definition.
 */
export interface WalletStage<_AttributeGroupId extends string> {
	/** An ID for this stage. */
	id: `stage:${string}`

	/** A human-readable label for this stage (e.g., "Stage 0", "Stage 1"). */
	label: string

	/** A description of what this stage represents. */
	description: Content

	/**
	 * The criteria groups for this stage.
	 * Wallets must `PASS` all of these criteria groups,
	 * as well as any criteria groups for past stages in the WalletLadder,
	 * in order to pass this stage.
	 */
	criteriaGroups: NonEmptyArray<WalletStageGroup<_AttributeGroupId>>
}

/**
 * A linear set of stages that wallets may clear.
 *
 * Because a wallet may be of multiple types, a single wallet may be evaluated
 * on multiple ladders.
 */
export interface WalletLadder<_AttributeGroupId extends string> {
	/**
	 * Stages, ordered from the lowest bar to the highest bar to meet.
	 * A wallet passes the n-th stage if and only if it passes all previous
	 * (n-1) stages before it in this array, and passes all criteria of the
	 * nth stage. If a wallet does not meet the nth stage, then further stages
	 * are not evaluated.
	 * If any evaluated stage criterion returns `UNRATED`, the wallet is not
	 * rated on the entire ladder, even if prior stages resulted in a
	 * non-`UNRATED` evaluation.
	 */
	stages: NonEmptyArray<WalletStage<_AttributeGroupId>>

	/**
	 * Returns whether this ladder should apply to the given wallet.
	 *
	 * A single wallet may be applicable on multiple (or zero) ladders.
	 */
	applicableTo: (wallet: StageEvaluatableWallet<_AttributeGroupId>) => boolean
}

/**
 * The result of evaluating a wallet on a ladder.
 */
export type WalletLadderEvaluation<_AttributeGroupId extends string> = {
	/** The ladder the wallet was rated on. */
	ladder: WalletLadder<_AttributeGroupId>

	/**
	 * The highest stage that the wallet reached on this ladder.
	 *
	 * A value of 'NOT_APPLICABLE' means it does not make sense to
	 * evaluate the wallet on this ladder.
	 *
	 * A value of 'QUALIFIED_FOR_NO_STAGES' means the wallet did not
	 * qualify for even the zeroth stage of the ladder.
	 */
	stage: WalletStage<_AttributeGroupId> | 'NOT_APPLICABLE' | 'QUALIFIED_FOR_NO_STAGES'
}

export function stageCriterionEvaluationPerVariant<_AttributeGroupId extends string>(
	variants: NonEmptySet<Variant>,
	variantEval: (variantWallet: ResolvedWallet<_AttributeGroupId>) => StageCriterionEvaluation,
	options?: {
		/**
		 * What to return if no wallet variants are in scope.
		 * Throw an error if this situation occurs and ifNoVariantInScope is null.
		 */
		ifNoVariantInScope: StageCriterionEvaluation | null
	},
): (wallet: StageEvaluatableWallet<_AttributeGroupId>) => StageCriterionEvaluation {
	return (wallet: StageEvaluatableWallet<_AttributeGroupId>): StageCriterionEvaluation => {
		const evaluations: StageCriterionEvaluation[] = []

		for (const variant of setItems(variants)) {
			const variantWallet = wallet.variants[variant]

			if (variantWallet === undefined) {
				continue
			}

			evaluations.push(variantEval(variantWallet))
		}

		if (!isNonEmptyArray(evaluations)) {
			if (options !== undefined && options.ifNoVariantInScope !== null) {
				return options.ifNoVariantInScope
			}

			throw new Error(
				`Wallet did not match any of the expected variants: ${setItems(variants).join(' | ')}`,
			)
		}

		const maybeUnrated = evaluations.find(
			evaluation => evaluation.rating === StageCriterionRating.UNRATED,
		)

		if (maybeUnrated !== undefined) {
			return maybeUnrated
		}

		const maybeFailed = evaluations.find(
			evaluation => evaluation.rating === StageCriterionRating.FAIL,
		)

		if (maybeFailed !== undefined) {
			return maybeFailed
		}

		return nonEmptyGet(evaluations)
	}
}

/**
 * Helper function for `WalletStageCriterion.evaluate` functions that are
 * based on existing attributes.
 *
 * @param variants The variants to look for. All wallets must have at least one of these variants.
 * @param attribute The attribute to look at the evaluation for.
 * @param options More options for the behavior of this function.
 * @returns A function that can be used as `WalletStageCriterion.evaluate` for this attribute.
 */
export function variantsMustPassAttribute<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	variants: NonEmptySet<Variant>,
	attribute: Attribute<_OutcomeMetadata>,
	options?: {
		/** Whether to allow `PARTIAL` ratings. */
		allowPartial: boolean

		/**
		 * UNVERIFIABLE evaluations use this sentence as explanation.
		 * If THROW, an error is thrown.
		 * If PASS, unverifiability does not impact stage evaluation for this criterion.
		 */
		ifUnverifiable: Sentence<WalletNameStrings> | 'THROW' | 'PASS'

		/**
		 * What to return if none of the wallet's variants are in scope.
		 * If null, this case will throw an error.
		 */
		ifNoVariantInScope: StageCriterionEvaluation | null
	},
): (wallet: StageEvaluatableWallet<_AttributeGroupId>) => StageCriterionEvaluation {
	if (options === undefined) {
		if (attribute.wording.midSentenceName === null) {
			throw new Error(
				`Attribute ${attribute.displayName}: specify either options.ifUnverifiable or wording.midSentenceName`,
			)
		}

		options = {
			allowPartial: false,
			ifUnverifiable: sentence(
				`{{WALLET_NAME}}'s ${attribute.wording.midSentenceName} cannot be publicly verified.`,
			),
			ifNoVariantInScope: null,
		}
	}

	const evaluateFunction = stageCriterionEvaluationPerVariant(
		variants,
		(variantWallet): StageCriterionEvaluation => {
			const evalAttr = getAttributeFromTree(attributeGroupById, variantWallet.attributes, attribute)

			if (evalAttr === null) {
				throw new Error(
					`Wallet variant ${variantWallet.variant} does not have any evaluated attribute with ID ${attribute.id}`,
				)
			}

			const isVerifiable =
				evalAttr.evaluation.outcome.verifiability === Verifiability.VERIFIABLE ||
				evalAttr.evaluation.outcome.verifiability === Verifiability.SELF_EVIDENT

			switch (evalAttr.evaluation.outcome.rating) {
				case Rating.EXEMPT:
					return {
						rating: StageCriterionRating.EXEMPT,
						explanation: evalAttr.evaluation.outcome.shortExplanation,
					}
				case Rating.FAIL:
					return {
						rating: StageCriterionRating.FAIL,
						explanation: evalAttr.evaluation.outcome.shortExplanation,
					}
				case Rating.UNRATED:
					return { rating: StageCriterionRating.UNRATED }
				case Rating.PARTIAL:
					if (!options.allowPartial) {
						return {
							rating: StageCriterionRating.FAIL,
							explanation: evalAttr.evaluation.outcome.shortExplanation,
						}
					}

					if (!isVerifiable) {
						if (options.ifUnverifiable === 'THROW') {
							throw new Error(
								`Attribute ${evalAttr.attribute.displayName} unexpectedly produced an evaluation with verifiability = ${evalAttr.evaluation.outcome.verifiability}`,
							)
						}

						if (options.ifUnverifiable !== 'PASS') {
							return {
								rating: StageCriterionRating.FAIL,
								explanation: options.ifUnverifiable,
							}
						}
					}
				// Else, fall through to the PASS case.
				case Rating.PASS:
					if (!isVerifiable) {
						if (options.ifUnverifiable === 'THROW') {
							throw new Error(
								`Attribute ${evalAttr.attribute.displayName} unexpectedly produced an evaluation with verifiability = ${evalAttr.evaluation.outcome.verifiability}`,
							)
						}

						if (options.ifUnverifiable !== 'PASS') {
							return {
								rating: StageCriterionRating.FAIL,
								explanation: options.ifUnverifiable,
							}
						}
					}

					return {
						rating: StageCriterionRating.PASS,
						explanation: evalAttr.evaluation.outcome.shortExplanation,
					}
			}
		},
		{
			ifNoVariantInScope: options.ifNoVariantInScope,
		},
	)

	// Associate attribute ID with the evaluate function so it can be easily retrieved
	// without needing to serialize the function
	evaluateFunctionAttributeIds.set(evaluateFunction, attribute.id)

	return evaluateFunction
}

/**
 * Evaluate and rate a wallet on a single ladder.
 */
export function evaluateWalletOnLadder<_AttributeGroupId extends string>(
	wallet: StageEvaluatableWallet<_AttributeGroupId>,
	ladder: WalletLadder<_AttributeGroupId>,
): WalletLadderEvaluation<_AttributeGroupId> {
	if (!ladder.applicableTo(wallet)) {
		return { ladder, stage: 'NOT_APPLICABLE' }
	}

	let clearedStage: WalletStage<_AttributeGroupId> | null = null

	for (const stage of ladder.stages) {
		const stageEvaluations = (() => {
			try {
				return nonEmptyFlatten(
					nonEmptyMap(stage.criteriaGroups, criteriaGroup => {
						try {
							return nonEmptyMap(criteriaGroup.criteria, criterion => {
								try {
									return criterion.evaluate(wallet)
								} catch (e) {
									throw new Error(`Criterion ${criterion.id}: ${getErrorMessage(e)}`)
								}
							})
						} catch (e) {
							throw new Error(`Criteria group ${criteriaGroup.id}: ${getErrorMessage(e)}`)
						}
					}),
				)
			} catch (e) {
				throw new Error(`Stage ${stage.id}: ${getErrorMessage(e)}`)
			}
		})()

		// This cannot vacuously pass, because `stageEvaluations` is guaranteed to be non-empty.
		if (stageEvaluations.every(evaluation => evaluation.rating === StageCriterionRating.PASS)) {
			clearedStage = stage
			continue
		}
	}

	if (clearedStage === null) {
		return { ladder, stage: 'QUALIFIED_FOR_NO_STAGES' }
	}

	return { ladder, stage: clearedStage }
}
