import { type Sentence } from '@/types/content'
import {
	isNonEmptyArray,
	nonEmptyGet,
	nonEmptyRemap,
	nonEmptyValues,
} from '@/types/utils/non-empty'

import {
	type Attribute,
	defaultRatingScore,
	type EvaluatedAttribute,
	evaluatedAttributes,
	type EvaluatedGroup,
	EvaluationContext,
	isExempt,
	type OutcomeMetadata,
	Rating,
	type ValueSet,
	type WalletNameStrings,
} from './attributes'
import type { ResolvedFeatures } from './features'
import { type MaybeUnratedScore, type Score, type WeightedScore, weightedScore } from './score'
import type { AtLeastOneVariant, Variant } from './variants'
import type { WalletMetadata } from './wallet'

/**
 * An attribute group is a collection of attributes that are related to one
 * another. For example, all attributes about privacy would be in the same
 * attribute group.
 */
export interface AttributeGroup<_AttributeGroupId extends string> {
	/** Unique ID of the attribute group. */
	id: _AttributeGroupId

	/** A friendly icon for the group. */
	icon: string

	/** A human-readable name for the group. */
	displayName: string

	/**
	 * A short question to which this attribute group is the answer.
	 * For example, for an attribute group about privacy, a good question
	 * might be "How well does {wallet} protect your privacy?".
	 */
	perWalletQuestion: Sentence<WalletNameStrings>

	/** Attributes with their weights. */
	attributes: _AttributeWithWeight<any>[]
}

/** Attribute with hardcoded weight for use in attribute groups. */
export type _AttributeWithWeight<_OutcomeMetadata extends OutcomeMetadata> = {
	attribute: Attribute<_OutcomeMetadata>
	weight: number
}

export type AttributeTree<_AttributeGroupId extends string> = {
	[K in _AttributeGroupId]: AttributeGroup<K>
}

/** Evaluated attributes for a single wallet. Each group has only its own attribute IDs. */
export type EvaluationTree<_AttributeGroupId extends string> = Record<
	_AttributeGroupId,
	Record<string, EvaluatedAttribute<any>>
>

/** Rate a wallet's attributes based on its features and metadata. */
export function evaluateAttributes<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	features: ResolvedFeatures,
	walletMetadata: WalletMetadata,
): EvaluationTree<_AttributeGroupId> {
	const evaluate = <_OutcomeMetadata extends OutcomeMetadata>(
		attr: Attribute<_OutcomeMetadata>,
	): EvaluatedAttribute<_OutcomeMetadata> => {
		const ctx = EvaluationContext.create(attr, features)

		if (attr.exempted !== undefined) {
			const maybeExempt = attr.exempted(ctx, walletMetadata)

			if (maybeExempt !== null) {
				if (!isExempt(maybeExempt)) {
					throw new Error(
						`Attribute ${attr.id}'s exemption rating function returned a non-exempt rating`,
					)
				}

				return {
					attribute: attr,
					evaluation: maybeExempt,
				}
			}
		}

		return {
			attribute: attr,
			evaluation: attr.evaluate(ctx),
		}
	}

	// @ts-expect-error -- Group lists heterogeneous attribute outcome metadata; each row is still `Attribute<OutcomeMetadata>`.
	return Object.fromEntries(
		Object.entries(attributeTree).map(([attrGroupId, attrGroup]) => [
			attrGroupId,
			Object.fromEntries(
				attrGroup.attributes.map(({ attribute }) => [attribute.id, evaluate(attribute)]),
			),
		]),
	)
}

/**
 * Aggregate per-variant evaluated attributes into
 * a single non-per-variant tree of evaluated attributes.
 */
export function aggregateAttributes<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	perVariantTree: AtLeastOneVariant<EvaluationTree<_AttributeGroupId>>,
): EvaluationTree<_AttributeGroupId> {
	const aggregate = (
		getter: (tree: EvaluationTree<_AttributeGroupId>) => EvaluatedAttribute<OutcomeMetadata>,
	): EvaluatedAttribute<OutcomeMetadata> => {
		const attr = getter(
			nonEmptyGet(nonEmptyValues<Variant, EvaluationTree<_AttributeGroupId>>(perVariantTree)),
		)

		const evaluations = nonEmptyRemap(
			perVariantTree,
			(_, tree: EvaluationTree<_AttributeGroupId>) => getter(tree).evaluation,
		)

		return {
			attribute: attr.attribute,
			evaluation: attr.attribute.aggregate(evaluations),
		}
	}

	// @ts-expect-error -- Heterogeneous attribute metadata per group; shape matches EvaluationTree.
	return Object.fromEntries(
		Object.entries(attributeTree).map(([attrGroupId, attrGroup]) => [
			attrGroupId,
			Object.fromEntries(
				attrGroup.attributes.map(({ attribute }) => [
					attribute.id,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- EvaluationTree values are heterogeneous; aggregate() widens to OutcomeMetadata.
					aggregate(tree => tree[attrGroupId][attribute.id]),
				]),
			),
		]),
	)
}

type EvaluatedGroupFromAttributeGroup<AttrGroup extends AttributeGroup<string>> =
	AttrGroup extends AttributeGroup<infer _AttributeGroupId>
		? {
				[AttributeWithWeight in AttrGroup['attributes'][number] as AttributeWithWeight['attribute']['id']]: EvaluatedAttribute<any>
			}
		: never

/**
 * Iterate over all non-exempt attribute groups in a tree, calling `fn` with each group.
 */
export function mapNonExemptAttributeGroupsInTree<R, _AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	evalTree: EvaluationTree<_AttributeGroupId>,
	fn: (
		attrGroup: AttributeGroup<_AttributeGroupId>,
		evalGroup: EvaluatedGroupFromAttributeGroup<typeof attrGroup>,
	) => R,
): R[] {
	return Object.values(attributeTree)
		.filter(attrGroup => {
			const evalGroup = evalTree[attrGroup.id]

			return evalGroup !== undefined && numNonExemptGroupAttributes(evalGroup) > 0
		})
		.map((attrGroup): R => {
			const evalGroup = evalTree[attrGroup.id]

			return fn(attrGroup, evalGroup)
		})
}

/**
 * Iterate over all non-exempt attributes in an evaluated attribute group,
 * calling `fn` with each attribute.
 */
export function mapNonExemptGroupAttributes<T, Vs extends ValueSet>(
	evalGroup: EvaluatedGroup<Vs>,
	fn: <_OutcomeMetadata extends OutcomeMetadata>(
		evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
		index: number,
	) => T,
): T[] {
	return Object.values(evalGroup)
		.filter(evalAttr => evalAttr.evaluation.outcome.rating !== Rating.EXEMPT)
		.map(fn)
}

/**
 * Return the number of non-exempt attributes in an evaluated attribute group.
 */
export function numNonExemptGroupAttributes<Vs extends ValueSet>(
	evalGroup: EvaluatedGroup<Vs>,
): number {
	return Object.values(evalGroup).filter(
		(evalAttr): boolean => evalAttr.evaluation.outcome.rating !== Rating.EXEMPT,
	).length
}

/**
 * Given an evaluation tree as template, call `fn` with a getter function
 * that can return that attribute for any given tree.
 * Useful to compare multiple trees of attributes, by calling `getter` on
 * various trees.
 */
export function mapAttributesGetter<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	templateTree: EvaluationTree<_AttributeGroupId>,
	fn: (
		getter: (
			evalTree: EvaluationTree<_AttributeGroupId>,
		) => EvaluatedAttribute<_OutcomeMetadata> | undefined,
	) => void,
): void {
	for (const groupName of Object.keys(templateTree)) {
		for (const attrName of Object.keys(templateTree[groupName])) {
			fn(evalTree => evalTree[groupName][attrName])
		}
	}
}

/**
 * Given an attribute evaluation from any template EvaluationTree,
 * get the same evaluated attribute from a different EvaluationTree.
 * Useful when needing to look up the same evaluation from a different tree
 * such as from a different Variant.
 */
export function getEvaluationFromOtherTree<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	evalAttr: EvaluatedAttribute<_OutcomeMetadata>,
	otherEvalTree: EvaluationTree<_AttributeGroupId>,
): EvaluatedAttribute<_OutcomeMetadata> {
	const otherEvalAttr = getAttributeFromTree(attributeTree, otherEvalTree, evalAttr.attribute)

	if (otherEvalAttr === null) {
		throw new Error(
			`Incomplete evaluation tree; did not found evaluation for attribute ${evalAttr.attribute.id}`,
		)
	}

	return otherEvalAttr
}

/**
 * Calculate a score for an attribute group based on its weights and evaluations.
 * @param attrGroup The attribute group (weights are in attributes array).
 * @param evaluatedGroup The evaluated attributes for this group (not a full EvaluationTree).
 * @returns A score between 0.0 (lowest) and 1.0 (highest) or null if exempt.
 */
export function calculateAttributeGroupScore<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	attrGroup: AttributeGroup<_AttributeGroupId>,
	evaluations: EvaluatedGroupFromAttributeGroup<typeof attrGroup>,
): MaybeUnratedScore {
	const evalAttrs = evaluatedAttributes(evaluations)

	const subScores = attrGroup.attributes
		.map(({ attribute, weight }) => {
			const matchedEvalAttr = evalAttrs.find(evalAttr => evalAttr.attribute.id === attribute.id)

			if (!matchedEvalAttr) {
				throw new Error(
					`Incomplete evaluation group; did not find evaluation for attribute ${attribute.id}`,
				)
			}

			const { outcome } = matchedEvalAttr.evaluation
			const score = outcome.score ?? defaultRatingScore(outcome)

			return { score, weight }
		})
		.filter((s): s is WeightedScore => s !== null)

	if (isNonEmptyArray(subScores)) {
		let hasUnratedComponent = false

		for (const evalAttr of evaluatedAttributes(evaluations)) {
			hasUnratedComponent ||= evalAttr.evaluation.outcome.rating === Rating.UNRATED
		}

		return { score: weightedScore(subScores), hasUnratedComponent }
	}

	return null
}

/**
 * Calculate the overall wallet score by averaging all attribute group scores.
 * @param evalTree The evaluation tree to score.
 * @param attrGroupPredicate A predicate determining whether the given attribute group should be scored.
 * @returns The overall score between 0.0 (lowest) and 1.0 (highest), or null if no scores.
 */
export const calculateOverallScore = <_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	evalTree: EvaluationTree<_AttributeGroupId>,
	attrGroupPredicate: (attrGroup: AttributeGroup<_AttributeGroupId>) => boolean,
): MaybeUnratedScore => {
	const scores = mapNonExemptAttributeGroupsInTree(
		attributeTree,
		evalTree,
		(
			attrGroup: AttributeGroup<_AttributeGroupId>,
			evalGroup: EvaluatedGroupFromAttributeGroup<typeof attrGroup>,
		) => {
			if (!attrGroupPredicate(attrGroup)) {
				return null
			}

			return calculateAttributeGroupScore(attrGroup, evalGroup)
		},
	).filter((score): score is { score: Score; hasUnratedComponent: boolean } => score !== null)

	if (!isNonEmptyArray(scores)) {
		return null
	}

	return {
		score:
			scores.reduce((sum, { score }) => (score === null ? sum : sum + score), 0) / scores.length,
		hasUnratedComponent: scores.some(score => score.hasUnratedComponent),
	}
}

/**
 * Format title text for an attribute group.
 * @param attrGroup The attribute group to format.
 * @param groupScore The score for the group, or null if not available.
 * @param showScores Whether to show scores in the title.
 * @returns Formatted title text showing icon and score (if enabled) or just display name.
 */
export const formatAttributeGroupTitleText = (
	attrGroup: AttributeGroup<string>,
	groupScore: MaybeUnratedScore,
	showScores: boolean,
) =>
	`${attrGroup.icon} ${attrGroup.displayName}${
		showScores
			? `\n\n${
					groupScore !== null && groupScore.score !== null
						? `${(groupScore.score * 100).toFixed(0)}%${groupScore.hasUnratedComponent ? ' (has unrated components)' : ''}`
						: 'N/A'
				}`
			: ''
	}`

/**
 * Look up an attribute group by ID, verifying that it exists and is not
 * entirely exempt from the given EvaluationTree.
 */
export function getAttributeGroupById<_AttributeGroupId extends string>(
	id: string,
	attributeTree: AttributeTree<_AttributeGroupId>,
	evalTree: EvaluationTree<_AttributeGroupId>,
): AttributeGroup<_AttributeGroupId> | null {
	const hasAttributeGroup = (id: string): id is _AttributeGroupId => id in attributeTree

	if (!hasAttributeGroup(id)) {
		return null
	}

	const attrGroup = attributeTree[id]

	if (
		!mapNonExemptAttributeGroupsInTree(
			attributeTree,
			evalTree,
			(attrGroupInTree, _evalGroup) => attrGroup.id === attrGroupInTree.id,
		).some(val => val)
	) {
		return null
	}

	return attrGroup
}

export function getAttributeFromTree<
	_AttributeGroupId extends string,
	_OutcomeMetadata extends OutcomeMetadata,
>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	evalTree: EvaluationTree<_AttributeGroupId>,
	attribute: Attribute<_OutcomeMetadata>,
): EvaluatedAttribute<_OutcomeMetadata> | null {
	const evalAttrs = mapNonExemptAttributeGroupsInTree(attributeTree, evalTree, (_, evalGroup) =>
		evaluatedAttributes(evalGroup).find(evalAttr => evalAttr.attribute.id === attribute.id),
	).filter(v => v !== undefined)

	switch (evalAttrs.length) {
		case 0:
			return null
		case 1:
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Attribute IDs are globally unique, so this match has the requested metadata type.
			return evalAttrs[0] as unknown as EvaluatedAttribute<_OutcomeMetadata>
		default:
			throw new Error(`Found multiple attributes with the same ID ${attribute.id}`)
	}
}
