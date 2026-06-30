import { describe, expect, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-tree'
import { type Evaluation, type OutcomeMetadata, Rating, ratingToText } from '@/schema/attributes'

import { warmupHarperLinter } from './utils/grammar'

function isSampleEvaluation(e: unknown): e is Evaluation<OutcomeMetadata> {
	if (typeof e !== 'object' || e === null || !('outcome' in e)) {
		return false
	}

	const outcome = e.outcome

	return (
		typeof outcome === 'object' &&
		outcome !== null &&
		'id' in outcome &&
		'rating' in outcome &&
		typeof (outcome as { id: unknown }).id === 'string' &&
		(outcome as { rating: unknown }).rating !== undefined
	)
}

await warmupHarperLinter()

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const { attribute } of attributeGroup.attributes) {
				describe(`attribute ${attribute.displayName}`, () => {
					it('has well-formed lowerCamelCase ID', () => {
						expect(attribute.id).toMatch(/^[a-z]+([A-Z][a-z]*)*/)
					})
					it('appears once in the group attribute list', () => {
						expect(
							attributeGroup.attributes.filter(row => row.attribute.id === attribute.id).length,
						).toBe(1)
					})
					const ratingScale = attribute.ratingScale

					switch (ratingScale.display) {
						case 'simple':
							break
						case 'fail-pass':
						// Fall through
						case 'pass-fail':
							if (
								![ratingScale.pass, ratingScale.partial, ratingScale.fail]
									.filter(ers => ers !== undefined)
									.map(ers => (Array.isArray(ers) ? ers : [ers]))
									.some(ers => ers.some(er => er.sampleEvaluations.length > 0))
							) {
								break
							}

							describe('example ratings', () => {
								for (const { rating, exampleRatings } of [
									{ rating: Rating.PASS, exampleRatings: ratingScale.pass },
									{ rating: Rating.PARTIAL, exampleRatings: ratingScale.partial },
									{ rating: Rating.FAIL, exampleRatings: ratingScale.fail },
								]) {
									if (exampleRatings === undefined) {
										continue
									}

									const exampleRatingsArray = [exampleRatings].flat()

									if (!exampleRatingsArray.some(er => er.sampleEvaluations.length > 0)) {
										continue
									}

									describe(ratingToText(rating).toLowerCase(), () => {
										for (const exampleRating of exampleRatingsArray) {
											const sampleEvaluations = exampleRating.sampleEvaluations
											const evaluations = sampleEvaluations.filter(isSampleEvaluation)

											expect(evaluations.length).toBe(sampleEvaluations.length)

											for (const sampleEvaluation of evaluations) {
												const { id, rating: sampleRating } = sampleEvaluation.outcome

												describe(id, () => {
													it('matches the correct rating', () => {
														expect(sampleRating).eq(rating)
													})
												})
											}
										}
									})
								}
							})
					}
				})
			}
		})
	}
})
