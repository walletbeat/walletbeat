import { attributeGroupById } from '@/data/attribute-groups'
import type { Attribute, OutcomeMetadata } from '@/schema/attributes'
import { allWalletLadders, WalletLadderType } from '@/schema/ladders'
import {
	getEvaluateFunctionAttributeId,
	StageCriterionRating,
	type StageEvaluatableWallet,
	type WalletLadder,
	type WalletStage,
	type WalletStageCriterion,
} from '@/schema/stages'
import type { RatedWallet } from '@/schema/wallet'

/**
 * Map of stage IDs to stage objects (using the first occurrence across all ladders).
 */
export const stagesById = new Map(
	Object.values(allWalletLadders)
		.flatMap(ladder => ladder.stages)
		.map(stage => [stage.id, stage] as const),
)

/**
 * Map of attribute IDs to attribute objects.
 */
export const attributesById = new Map(
	Object.values(attributeGroupById)
		.flatMap(attrGroup => attrGroup.attributes.map(({ attribute }) => attribute))
		.map(attr => [attr.id, attr] as const),
)

/**
 * Get all criteria in a stage.
 */
export const allCriteriaInStage = <_AttributeGroupId extends string>(
	stage: WalletStage<_AttributeGroupId>,
): WalletStageCriterion<_AttributeGroupId>[] =>
	stage.criteriaGroups.flatMap(criteriaGroup => criteriaGroup.criteria)

/**
 * Aggregate status for a stage or criteria group based on applicable criterion ratings.
 * Rule: any UNRATED → UNRATED; else all passed → PASS; else any passed → PARTIAL; else FAIL.
 * Throws if every criterion is EXEMPT (stage must have at least one applicable criterion).
 */
export type StageCountsStatus = 'PASS' | 'PARTIAL' | 'FAIL' | 'UNRATED'

export interface StageCountsAndStatus {
	passedCount: number
	totalCount: number
	status: StageCountsStatus
}

/**
 * Compute passed/total counts and aggregate status for a set of stage criteria.
 * "Applicable" = not EXEMPT. Status: any UNRATED → UNRATED; else all passed → PASS; else any passed → PARTIAL; else FAIL.
 * Throws if every criterion is EXEMPT (invalid stage definition for this wallet).
 */
export function computeCountsAndStatus<_AttributeGroupId extends string>(
	criteria: WalletStageCriterion<_AttributeGroupId>[],
	wallet: StageEvaluatableWallet<_AttributeGroupId>,
): StageCountsAndStatus {
	const allEvaluations = criteria.map(criterion => criterion.evaluate(wallet))
	const applicableEvaluations = allEvaluations.filter(e => e.rating !== StageCriterionRating.EXEMPT)
	const passedCount = applicableEvaluations.filter(
		e => e.rating === StageCriterionRating.PASS,
	).length
	const totalCount = applicableEvaluations.length
	const allExempt =
		allEvaluations.length > 0 && allEvaluations.every(e => e.rating === StageCriterionRating.EXEMPT)

	if (allExempt) {
		throw new Error(
			'Stage has no applicable criteria for this wallet (all criteria are EXEMPT). The stage definition should have at least one criterion that applies.',
		)
	}

	const hasUnrated = applicableEvaluations.some(e => e.rating === StageCriterionRating.UNRATED)
	const allPassed = totalCount > 0 && passedCount === totalCount
	const status: StageCountsStatus = hasUnrated
		? 'UNRATED'
		: allPassed
			? 'PASS'
			: passedCount > 0
				? 'PARTIAL'
				: 'FAIL'

	return { passedCount, totalCount, status }
}

/**
 * Check if an attribute is used in any stage requirement by checking if the attribute
 * is referenced in the ladder structure. Since variantsMustPassAttribute creates closures
 * that capture the attribute, we check if the attribute ID appears in the serialized
 * ladder definitions (which includes the attribute references).
 * @param attribute The attribute to check
 * @returns true if the attribute is used in any stage criterion
 */
export function isAttributeUsedInStages<_OutcomeMetadata extends OutcomeMetadata>(
	attribute: Attribute<_OutcomeMetadata>,
): boolean {
	// The attribute objects are referenced in the stage definitions via variantsMustPassAttribute
	// We can check if the attribute ID appears in the ladder structure
	// by serializing and checking for the attribute ID
	const ladderString = JSON.stringify(allWalletLadders, (_, value: unknown) => {
		// When we encounter an attribute object, include its ID
		if (
			value &&
			typeof value === 'object' &&
			'id' in value &&
			'displayName' in value &&
			'question' in value
		) {
			return { id: value.id, _isAttribute: true }
		}

		return value
	})

	return ladderString.includes(`"id":"${attribute.id}"`)
}

/**
 * Check if an attribute is used in a specific stage.
 * @param attribute The attribute to check
 * @param stage The stage to check
 * @returns true if the attribute is used in the stage
 */
const isAttributeUsedInStageObject = <
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	attribute: Attribute<_OutcomeMetadata>,
	stage: WalletStage<_AttributeGroupId>,
): boolean =>
	allCriteriaInStage(stage).some(criterion => getCriterionAttributeId(criterion) === attribute.id)

/**
 * Check if an attribute is used in a specific stage by stage ID.
 * @param attribute The attribute to check
 * @param stageId The stage ID to check
 * @returns true if the attribute is used in the stage
 */
export const isAttributeUsedInStage = <
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	attribute: Attribute<_OutcomeMetadata>,
	stageId: WalletStage<_AttributeGroupId>['id'],
): boolean => {
	const stage = stagesById.get(stageId)

	return stage !== undefined && isAttributeUsedInStageObject(attribute, stage)
}

/**
 * Extract the attribute ID from a stage criterion if it uses variantsMustPassAttribute.
 * @param criterion The criterion to check
 * @returns The attribute ID if found, null otherwise
 */
export const getCriterionAttributeId = <_AttributeGroupId extends string>(
	criterion: WalletStageCriterion<_AttributeGroupId>,
): string | null => getEvaluateFunctionAttributeId(criterion.evaluate)

/**
 * Get all criteria that reference a specific attribute across all ladders.
 * @param attribute The attribute to find criteria for
 * @param wallet The wallet to find criteria for
 * @returns An array of objects containing ladder type, stage number, and criterion
 */
export function getAttributeCriteriaForWallet<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	ladders: Record<WalletLadderType, WalletLadder<_AttributeGroupId>>,
	attribute: Attribute<_OutcomeMetadata>,
	wallet: StageEvaluatableWallet<_AttributeGroupId>,
) {
	return Object.entries(ladders)
		.flatMap(([ladderType, ladder]) =>
			ladder.stages.map((stage, stageIndex) => ({
				ladderType,
				ladder,
				stage,
				stageIndex,
			})),
		)
		.filter(({ ladder }) => ladder.applicableTo(wallet))
		.filter(({ stage }) => isAttributeUsedInStageObject(attribute, stage))
		.flatMap(({ ladderType, stage, stageIndex }) =>
			allCriteriaInStage(stage)
				.filter(criterion => getCriterionAttributeId(criterion) === attribute.id)
				.map(criterion => ({ ladderType, stageNumber: stageIndex, criterion })),
		)
}

/**
 * Stage-evaluatable view of a RatedWallet (omits metadata and ladders).
 */
function toStageEvaluatable<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
): StageEvaluatableWallet<_AttributeGroupId> {
	const { metadata: _metadata, ladders: _ladders, ...rest } = wallet

	return rest
}

/**
 * Find which stage numbers (0-indexed) an attribute is used in for a given wallet,
 * restricted to stages where the wallet passes the criterion for that attribute.
 * Returns only the highest stage passed per ladder (e.g. "Stage 2" not "Stage 1, 2"
 * when the wallet passes both).
 */
export function getAttributeStagesForWallet<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	ladders: Record<WalletLadderType, WalletLadder<_AttributeGroupId>>,
	attribute: Attribute<_OutcomeMetadata>,
	wallet: RatedWallet<_AttributeGroupId>,
): Array<{ ladderType: WalletLadderType; stageNumbers: number[] }> {
	const stageEvaluatable = toStageEvaluatable(wallet)
	const criteria = getAttributeCriteriaForWallet(ladders, attribute, wallet)
	const stagesPassed = criteria
		.filter(
			({ criterion }) => criterion.evaluate(stageEvaluatable).rating === StageCriterionRating.PASS,
		)
		.map(({ ladderType, stageNumber }) => ({ ladderType, stageIndex: stageNumber }))

	const uniqueLadderTypes = Array.from(new Set(stagesPassed.map(({ ladderType }) => ladderType)))

	return uniqueLadderTypes.map(ladderType => {
		const indices = stagesPassed
			.filter(({ ladderType: type }) => type === ladderType)
			.map(({ stageIndex }) => stageIndex)
		const maxStageIndex = Math.max(...indices)

		return {
			ladderType,
			stageNumbers: [maxStageIndex],
		}
	})
}
