import { attributeTree } from '@/schema/attribute-groups'
import type { Attribute } from '@/schema/attributes'
import { ladders, WalletLadderType } from '@/schema/ladders'
import {
	getEvaluateFunctionAttributeId,
	type WalletStage,
	type WalletStageCriterion,
} from '@/schema/stages'
/**
 * Get all stages across all ladders with their ladder type and index.
 */
const allStages = Object.entries(ladders).flatMap(([ladderType, ladder]) =>
	ladder.stages.map((stage, stageIndex) => ({ ladderType, stage, stageIndex })),
)

/**
 * Map of stage IDs to stage objects (using the first occurrence across all ladders).
 */
export const stagesById = new Map(
	Object.values(ladders)
		.flatMap(ladder => ladder.stages)
		.map(stage => [stage.id, stage] as const),
)

/**
 * Map of attribute IDs to attribute objects.
 */
export const attributesById = new Map(
	Object.values(attributeTree)
		.flatMap(attrGroup => Object.values(attrGroup.attributes))
		.map(attr => [attr.id, attr] as const),
)

/**
 * Get all criteria in a stage.
 */
const allCriteriaInStage = (stage: WalletStage): WalletStageCriterion[] =>
	stage.criteriaGroups.flatMap(criteriaGroup => criteriaGroup.criteria)

/**
 * Check if an attribute is used in any stage requirement by checking if the attribute
 * is referenced in the ladder structure. Since variantsMustPassAttribute creates closures
 * that capture the attribute, we check if the attribute ID appears in the serialized
 * ladder definitions (which includes the attribute references).
 * @param attribute The attribute to check
 * @returns true if the attribute is used in any stage criterion
 */
export function isAttributeUsedInStages(attribute: Attribute): boolean {
	// The attribute objects are referenced in the stage definitions via variantsMustPassAttribute
	// We can check if the attribute ID appears in the ladder structure
	// by serializing and checking for the attribute ID
	const ladderString = JSON.stringify(ladders, (_, value: unknown) => {
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
const isAttributeUsedInStageObject = (attribute: Attribute, stage: WalletStage): boolean =>
	allCriteriaInStage(stage).some(criterion => getCriterionAttributeId(criterion) === attribute.id)

/**
 * Check if an attribute is used in a specific stage by stage ID.
 * @param attribute The attribute to check
 * @param stageId The stage ID to check
 * @returns true if the attribute is used in the stage
 */
export const isAttributeUsedInStage = (
	attribute: Attribute,
	stageId: WalletStage['id'],
): boolean => {
	const stage = stagesById.get(stageId)

	return stage !== undefined && isAttributeUsedInStageObject(attribute, stage)
}

/**
 * Find which stage numbers (0-indexed) an attribute is used in across all ladders.
 * @param attribute The attribute to check
 * @returns An array of objects containing ladder type and stage numbers where the attribute is used
 */
export function getAttributeStages(
	attribute: Attribute,
): Array<{ ladderType: WalletLadderType; stageNumbers: number[] }> {
	const stagesWithAttribute = allStages
		.filter(({ stage }) => isAttributeUsedInStageObject(attribute, stage))
		.map(({ ladderType, stageIndex }) => ({ ladderType, stageIndex }))

	const uniqueLadderTypes = Array.from(
		new Set(stagesWithAttribute.map(({ ladderType }) => ladderType)),
	)

	return uniqueLadderTypes.map(ladderType => ({
		ladderType,
		stageNumbers: stagesWithAttribute
			.filter(({ ladderType: type }) => type === ladderType)
			.map(({ stageIndex }) => stageIndex),
	}))
}

/**
 * Extract the attribute ID from a stage criterion if it uses variantsMustPassAttribute.
 * @param criterion The criterion to check
 * @returns The attribute ID if found, null otherwise
 */
export const getCriterionAttributeId = (criterion: WalletStageCriterion): string | null =>
	getEvaluateFunctionAttributeId(criterion.evaluate)

/**
 * Get all criteria that reference a specific attribute across all ladders.
 * @param attribute The attribute to find criteria for
 * @returns An array of objects containing ladder type, stage number, and criterion
 */
export function getAttributeCriteria(
	attribute: Attribute,
): Array<{ ladderType: WalletLadderType; stageNumber: number; criterion: WalletStageCriterion }> {
	return allStages
		.filter(({ stage }) => isAttributeUsedInStageObject(attribute, stage))
		.flatMap(({ ladderType, stage, stageIndex }) =>
			allCriteriaInStage(stage)
				.filter(criterion => getCriterionAttributeId(criterion) === attribute.id)
				.map(criterion => ({ ladderType, stageNumber: stageIndex, criterion })),
		)
}
