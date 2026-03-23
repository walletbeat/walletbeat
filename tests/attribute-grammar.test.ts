import { describe, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-groups'
import type { ExampleRating, Outcome } from '@/schema/attributes'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMap,
} from '@/types/utils/non-empty'

import { contentGrammarLint, walletContentGrammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const attribute of Object.values(attributeGroup.attributes)) {
				describe(`attribute ${attribute.displayName}`, () => {
					walletContentGrammarLint('name', attribute.displayName)
					walletContentGrammarLint('importance', attribute.why)
					walletContentGrammarLint('methodology', attribute.methodology)

					if (attribute.wording.midSentenceName === null) {
						walletContentGrammarLint('how is it evaluated', attribute.wording.howIsEvaluated)
						walletContentGrammarLint('what can be done', attribute.wording.whatCanWalletDoAboutIts)
					} else {
						walletContentGrammarLint(
							'mid-sentence name',
							`Is this wallet's ${attribute.wording.midSentenceName} good or bad?`,
						)
					}

					switch (attribute.ratingScale.display) {
						case 'simple':
							walletContentGrammarLint('rating scale', attribute.ratingScale.content)
							break
						case 'fail-pass':
						case 'pass-fail':
							;(() => {
								const passRatings = assertNonEmptyArray(
									Array.isArray(attribute.ratingScale.pass)
										? attribute.ratingScale.pass
										: [attribute.ratingScale.pass],
								)
								const partialRatings =
									attribute.ratingScale.partial === undefined
										? []
										: Array.isArray(attribute.ratingScale.partial)
											? attribute.ratingScale.partial
											: []
								const failRatings = assertNonEmptyArray(
									Array.isArray(attribute.ratingScale.fail)
										? attribute.ratingScale.fail
										: [attribute.ratingScale.fail],
								)
								const checkRatings = <V extends Outcome>(
									scale: string,
									ratings: NonEmptyArray<ExampleRating<V>>,
								) => {
									describe(scale, () => {
										it('has correct grammar', async () => {
											await Promise.all(
												nonEmptyMap(
													ratings,
													async rating => await contentGrammarLint(rating.description),
												),
											)
										})
									})
								}

								describe('rating scale', () => {
									checkRatings('pass', passRatings)

									if (isNonEmptyArray(partialRatings)) {
										checkRatings('partial', partialRatings)
									}

									checkRatings('fail', failRatings)
								})
							})()
					}
				})
			}
		})
	}
})
