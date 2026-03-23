import { describe, expect, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-groups'
import { type Evaluation, type OutcomeMetadata, Rating, ratingToText } from '@/schema/attributes'

import { warmupHarperLinter } from './utils/grammar'

function isSampleEvaluation(e: unknown): e is Evaluation<OutcomeMetadata> {
	if (typeof e !== 'object' || e === null || !('value' in e)) {
		return false
	}

	const v = (e as { value: unknown }).value

	return (
		typeof v === 'object' &&
		v !== null &&
		'id' in v &&
		'rating' in v &&
		typeof (v as { id: unknown }).id === 'string' &&
		(v as { rating: unknown }).rating !== undefined
	)
}

await warmupHarperLinter()

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const [attributeName, attribute] of Object.entries(attributeGroup.attributes)) {
				describe(`attribute ${attribute.displayName}`, () => {
					it('has well-formed lowerCamelCase ID', () => {
						expect(attribute.id).toMatch(/^[a-z]+([A-Z][a-z]*)*/)
					})
					it('has matching ID and in the attribute and attribute tree', () => {
						expect(attribute.id).eq(attributeName)
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

									if (!exampleRatings.some(er => er.sampleEvaluations.length > 0)) {
										continue
									}

									describe(ratingToText(rating).toLowerCase(), () => {
										for (const exampleRating of exampleRatings) {
											const evaluations = exampleRating.sampleEvaluations.filter(isSampleEvaluation)

											for (const sampleEvaluation of evaluations) {
												const { id, rating: sampleRating } = sampleEvaluation.value

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
