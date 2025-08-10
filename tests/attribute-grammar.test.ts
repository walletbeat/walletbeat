import { describe, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-groups'
import type { ExampleRating, Value } from '@/schema/attributes'
import { prerenderTypographicContent, type TypographicContent } from '@/types/content'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMap,
} from '@/types/utils/non-empty'

import { contentGrammarLint, grammarLint } from './utils/grammar'

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const attribute of Object.values(attributeGroup.attributes)) {
				describe(`attribute ${attribute.displayName}`, () => {
					const checkGrammar = (
						name: string,
						content: string | TypographicContent<{ WALLET_NAME: string }> | TypographicContent,
					) => {
						describe(name, () => {
							it('has correct grammar', async () => {
								if (typeof content === 'string') {
									await grammarLint(content, { language: 'plaintext' })
								} else {
									content = prerenderTypographicContent(content, {
										WALLET_NAME: 'Example Wallet',
									})
									await contentGrammarLint(content)
								}
							})
						})
					}

					checkGrammar('name', attribute.displayName)
					checkGrammar('importance', attribute.why)
					checkGrammar('methodology', attribute.methodology)

					if (attribute.wording.midSentenceName === null) {
						checkGrammar('how is it evaluated', attribute.wording.howIsEvaluated)
						checkGrammar('what can be done', attribute.wording.whatCanWalletDoAboutIts)
					} else {
						checkGrammar(
							'mid-sentence name',
							`Is this wallet's ${attribute.wording.midSentenceName} good or bad?`,
						)
					}

					switch (attribute.ratingScale.display) {
						case 'simple':
							checkGrammar('rating scale', attribute.ratingScale.content)
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
								const checkRatings = <V extends Value>(
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
