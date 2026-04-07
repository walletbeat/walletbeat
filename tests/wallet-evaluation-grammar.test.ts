import { describe } from 'vitest'

import { variantToName } from '@/constants/variants'
import { attributeGroupById, AttributeGroupId } from '@/data/attribute-groups'
import { allRatedWallets } from '@/data/wallets'
import {
	type AttributeGroup,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import {
	type Attribute,
	type EvaluatedAttribute,
	type Evaluation,
	type OutcomeMetadata,
	Rating,
	ratingEnum,
	ratingToText,
} from '@/schema/attributes'
import { isTypographicContent } from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { walletContentGrammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('evaluations', () => {
	type NamedEvaluation<_OutcomeMetadata extends OutcomeMetadata> = {
		name: string
		evaluation: Evaluation<_OutcomeMetadata>
	}
	type PerAttribute<_OutcomeMetadata extends OutcomeMetadata> = {
		attribute: Attribute<_OutcomeMetadata>
		perRating: Map<Rating, NamedEvaluation<_OutcomeMetadata>[]>
	}
	type PerGroup<_AttributeGroupId extends AttributeGroupId> = {
		attributeGroup: AttributeGroup<_AttributeGroupId>
		attributes: Map<string, PerAttribute<OutcomeMetadata>>
	}
	const evaluationsPerGroup: Map<string, PerGroup<AttributeGroupId>> = new Map()
	const addEvaluation = <
		_AttributeGroupId extends AttributeGroupId,
		_OutcomeMetadata extends OutcomeMetadata,
	>(
		attrGroup: AttributeGroup<_AttributeGroupId>,
		attribute: Attribute<OutcomeMetadata>,
		evaluation: NamedEvaluation<_OutcomeMetadata>,
	) => {
		let perGroup = evaluationsPerGroup.get(attrGroup.id)

		if (perGroup === undefined) {
			perGroup = {
				attributeGroup: attrGroup,
				attributes: new Map(),
			}
			evaluationsPerGroup.set(attrGroup.id, perGroup)
		}

		let perAttr = perGroup.attributes.get(attribute.id)

		if (perAttr === undefined) {
			perAttr = {
				attribute,
				perRating: new Map(),
			}

			perGroup.attributes.set(attribute.id, perAttr)
		}

		let evaluationsForRating = perAttr.perRating.get(evaluation.evaluation.outcome.rating)

		if (evaluationsForRating === undefined) {
			evaluationsForRating = []
			perAttr.perRating.set(evaluation.evaluation.outcome.rating, evaluationsForRating)
		}

		evaluationsForRating.push(evaluation)
	}

	for (const ratedWallet of Object.values(allRatedWallets)) {
		for (const { evalTree, variantName } of [
			{ evalTree: ratedWallet.overall, variantName: 'overall' },
			...Object.values(ratedWallet.variants)
				.filter((w): w is NonNullable<typeof w> => w != null)
				.map(resolvedWallet => ({
					evalTree: resolvedWallet.attributes,
					variantName: variantToName(resolvedWallet.variant, true),
				})),
		]) {
			mapNonExemptAttributeGroupsInTree(attributeGroupById, evalTree, (attrGroup, evalGroup) => {
				mapNonExemptGroupAttributes(evalGroup, evalAttr => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all attribute type parameters extend OutcomeMetadata.
					const genericEvalAttr = evalAttr as unknown as EvaluatedAttribute<OutcomeMetadata>

					addEvaluation(attrGroup, genericEvalAttr.attribute, {
						name: `${ratedWallet.metadata.displayName} ${variantName} rating`,
						evaluation: genericEvalAttr.evaluation,
					})
					const ratingScale = genericEvalAttr.attribute.ratingScale

					switch (ratingScale.display) {
						case 'simple':
							break
						case 'fail-pass':
						// Fall through
						case 'pass-fail':
							for (const row of [
								{ rating: Rating.PASS, exampleRatings: ratingScale.pass },
								{ rating: Rating.PARTIAL, exampleRatings: ratingScale.partial },
								{ rating: Rating.FAIL, exampleRatings: ratingScale.fail },
							]) {
								let { exampleRatings } = row
								const { rating } = row

								if (exampleRatings === undefined) {
									continue
								}

								if (!Array.isArray(exampleRatings)) {
									exampleRatings = [exampleRatings]
								}

								for (const exampleRating of exampleRatings) {
									for (const sampleEvaluation of exampleRating.sampleEvaluations) {
										addEvaluation(attrGroup, genericEvalAttr.attribute, {
											name: `sample ${ratingToText(rating).toLowerCase()} evaluation ${sampleEvaluation.outcome.id}`,
											evaluation: sampleEvaluation,
										})
									}
								}
							}
					}
				})
			})
		}
	}

	const sortedByStringKey = <V>(vs: V[], fn: (v: V) => string): V[] => {
		return vs.toSorted((a, b) => {
			if (fn(a) < fn(b)) {
				return -1
			}

			if (fn(a) > fn(b)) {
				return 1
			}

			return 0
		})
	}
	const sortedMapValues = <V>(map: Map<string, V>): V[] =>
		sortedByStringKey<[string, V]>(Array.from(map.entries()), kv => kv[0]).map(([_, v]) => v)

	for (const perGroup of sortedMapValues(evaluationsPerGroup)) {
		describe(perGroup.attributeGroup.displayName, () => {
			for (const perAttribute of sortedMapValues(perGroup.attributes)) {
				describe(perAttribute.attribute.displayName, () => {
					for (const rating of ratingEnum.items) {
						const evaluationsForRating = perAttribute.perRating.get(rating)

						if (evaluationsForRating === undefined || !isNonEmptyArray(evaluationsForRating)) {
							continue
						}

						for (const evaluation of sortedByStringKey(evaluationsForRating, v => v.name)) {
							describe(evaluation.name, () => {
								walletContentGrammarLint('name', evaluation.evaluation.outcome.displayName)
								walletContentGrammarLint(
									'explanation',
									evaluation.evaluation.outcome.shortExplanation,
								)

								if (isTypographicContent(evaluation.evaluation.details)) {
									walletContentGrammarLint('details', evaluation.evaluation.details)
								}

								if (evaluation.evaluation.howToImprove !== undefined) {
									walletContentGrammarLint('how to improve', evaluation.evaluation.howToImprove)
								}

								if (evaluation.evaluation.impact !== undefined) {
									walletContentGrammarLint('impact', evaluation.evaluation.impact)
								}
							})
						}
					}
				})
			}
		})
	}
})
