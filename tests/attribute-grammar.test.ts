import { describe, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-tree'
import {
	type Content,
	ContentType,
	isTypographicContent,
	type TypographicContent,
} from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { contentGrammarLint, walletContentGrammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

const hasDescription = (rating: unknown): rating is { description: TypographicContent } =>
	typeof rating === 'object' &&
	rating !== null &&
	'description' in rating &&
	isContent(rating.description) &&
	isTypographicContent(rating.description)

const isContent = (content: unknown): content is Content =>
	typeof content === 'object' &&
	content !== null &&
	'contentType' in content &&
	(content.contentType === ContentType.TEXT ||
		content.contentType === ContentType.MARKDOWN ||
		content.contentType === ContentType.COMPONENT)

const normalizeRatings = (ratings: unknown): { description: TypographicContent }[] =>
	(Array.isArray(ratings) ? ratings : [ratings]).filter(hasDescription)

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const { attribute } of attributeGroup.attributes) {
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
								const passRatings = normalizeRatings(attribute.ratingScale.pass)
								const partialRatings =
									attribute.ratingScale.partial === undefined
										? []
										: normalizeRatings(attribute.ratingScale.partial)
								const failRatings = normalizeRatings(attribute.ratingScale.fail)
								const checkRatings = (
									scale: string,
									ratings: { description: TypographicContent }[],
								) => {
									describe(scale, () => {
										it('has correct grammar', async () => {
											await Promise.all(
												ratings.map(async rating => await contentGrammarLint(rating.description)),
											)
										})
									})
								}

								describe('rating scale', () => {
									if (isNonEmptyArray(passRatings)) {
										checkRatings('pass', passRatings)
									}

									if (isNonEmptyArray(partialRatings)) {
										checkRatings('partial', partialRatings)
									}

									if (isNonEmptyArray(failRatings)) {
										checkRatings('fail', failRatings)
									}
								})
							})()
					}
				})
			}
		})
	}
})
