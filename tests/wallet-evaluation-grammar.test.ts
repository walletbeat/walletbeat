import { describe } from 'vitest'

import { variantToName } from '@/constants/variants'
import { allRatedWallets } from '@/data/wallets'
import {
	type EvaluationTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import {
	type Attribute,
	type AttributeGroup,
	type EvaluatedAttribute,
	type Evaluation,
	Rating,
	ratingEnum,
	ratingToText,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import { isTypographicContent } from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { walletContentGrammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('evaluations', () => {
	type NamedEvaluation<V extends Value> = {
		name: string
		evaluation: Evaluation<V>
	}
	type PerAttribute<V extends Value> = {
		attribute: Attribute<V>
		perRating: Map<Rating, NamedEvaluation<V>[]>
	}
	type PerGroup = {
		attributeGroup: AttributeGroup<ValueSet>
		attributes: Map<string, PerAttribute<Value>>
	}
	const evaluationsPerGroup: Map<string, PerGroup> = new Map()
	const addEvaluation = (
		attrGroup: AttributeGroup<ValueSet>,
		attribute: Attribute<Value>,
		evaluation: NamedEvaluation<Value>,
	) => {
		let perGroup: PerGroup | undefined = evaluationsPerGroup.get(attrGroup.id)

		if (perGroup === undefined) {
			perGroup = {
				attributeGroup: attrGroup,
				attributes: new Map(),
			}
			evaluationsPerGroup.set(attrGroup.id, perGroup)
		}

		let perAttr: PerAttribute<Value> | undefined = perGroup.attributes.get(attribute.id)

		if (perAttr === undefined) {
			perAttr = {
				attribute,
				perRating: new Map(),
			}

			perGroup.attributes.set(attribute.id, perAttr)
		}

		let evaluationsForRating: NamedEvaluation<Value>[] | undefined = perAttr.perRating.get(
			evaluation.evaluation.value.rating,
		)

		if (evaluationsForRating === undefined) {
			evaluationsForRating = []
			perAttr.perRating.set(evaluation.evaluation.value.rating, evaluationsForRating)
		}

		evaluationsForRating.push(evaluation)
	}

	for (const ratedWallet of Object.values(allRatedWallets)) {
		const trees: { tree: EvaluationTree; variantName: string }[] = [
			{ tree: ratedWallet.overall, variantName: 'overall' },
		].concat(
			Object.values(ratedWallet.variants)
				.filter((w): w is NonNullable<typeof w> => w != null)
				.map(resolvedWallet => ({
					tree: resolvedWallet.attributes,
					variantName: variantToName(resolvedWallet.variant, true),
				})),
		)

		for (const { tree, variantName } of trees) {
			mapNonExemptAttributeGroupsInTree(tree, (attrGroup, evalGroup) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all attribute groups type parameters extend ValueSet.
				const genericAttrGroup = attrGroup as unknown as AttributeGroup<ValueSet>

				mapNonExemptGroupAttributes(evalGroup, evalAttr => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all attribute type parameters extend Value.
					const genericEvalAttr = evalAttr as unknown as EvaluatedAttribute<Value>

					addEvaluation(genericAttrGroup, genericEvalAttr.attribute, {
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
							// eslint-disable-next-line prefer-const -- Can't use const on exampleRatings.
							for (let { rating, exampleRatings } of [
								{ rating: Rating.PASS, exampleRatings: ratingScale.pass },
								{ rating: Rating.PARTIAL, exampleRatings: ratingScale.partial },
								{ rating: Rating.FAIL, exampleRatings: ratingScale.fail },
							]) {
								if (exampleRatings === undefined) {
									continue
								}

								if (!Array.isArray(exampleRatings)) {
									exampleRatings = [exampleRatings]
								}

								for (const exampleRating of exampleRatings) {
									for (const sampleEvaluation of exampleRating.sampleEvaluations) {
										addEvaluation(genericAttrGroup, genericEvalAttr.attribute, {
											name: `sample ${ratingToText(rating).toLowerCase()} evaluation ${sampleEvaluation.value.id}`,
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
	const sortedMapValues = <V>(map: Map<string, V>): V[] => {
		return sortedByStringKey<[string, V]>(
			Array.from(map.entries()),
			(kv: [string, V]): string => kv[0],
		).map(([_, v]) => v)
	}

	for (const perGroup of sortedMapValues(evaluationsPerGroup)) {
		describe(perGroup.attributeGroup.displayName, () => {
			for (const perAttribute of sortedMapValues(perGroup.attributes)) {
				describe(perAttribute.attribute.displayName, () => {
					for (const rating of ratingEnum.items) {
						const evaluationsForRating = perAttribute.perRating.get(rating)

						if (evaluationsForRating === undefined || !isNonEmptyArray(evaluationsForRating)) {
							continue
						}

						for (const evaluation of sortedByStringKey(
							evaluationsForRating,
							(v: NamedEvaluation<Value>) => v.name,
						)) {
							describe(evaluation.name, () => {
								walletContentGrammarLint('name', evaluation.evaluation.value.displayName)
								walletContentGrammarLint(
									'explanation',
									evaluation.evaluation.value.shortExplanation,
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
