import type { Content, Paragraph, Sentence, TypographicContent } from '@/types/content'
import { type NonEmptyArray, nonEmptyMap, type NonEmptyRecord } from '@/types/utils/non-empty'

import type { ResolvedFeatures } from './features'
import type { FullyQualifiedReference, ReferenceArray } from './reference'
import type { Score } from './score'
import type { AtLeastOneVariant } from './variants'
import type { RatedWallet, WalletMetadata } from './wallet'

/**
 * Rating is an enum that should be visually meaningful.
 * It is used to determine the color of the pie chart for an attribute.
 */
export enum Rating {
	/**
	 * FAIL means the wallet does not fulfill this attribute.
	 */
	FAIL = 'FAIL',

	/**
	 * PARTIAL means the wallet partially fulfills this attribute
	 * (e.g. only with non-trivial user configuration, or with important
	 * caveats.)
	 */
	PARTIAL = 'PARTIAL',

	/**
	 * PASS means the wallet fully fulfills this attribute.
	 */
	PASS = 'PASS',

	/**
	 * UNRATED means the attribute was not rated.
	 * This is displayed in a neutral color.
	 */
	UNRATED = 'UNRATED',

	/**
	 * EXEMPT means the wallet is exempt from being rated on this attribute.
	 * This is useful for wallets that do not aim to be generic full-featured
	 * Ethereum wallets. For example, it would be irrelevant to rate a
	 * payments-focused browser extension wallet on whether it implements
	 * EIP-6963 ("Multi Injected Provider Discovery"), because such a wallet
	 * does not aim to be an injected provider in web pages at all.
	 */
	EXEMPT = 'EXEMPT',
}

export const ratingIcons = {
	[Rating.PASS]: '✅',
	[Rating.PARTIAL]: '⚠️',
	[Rating.FAIL]: '❌',
	[Rating.UNRATED]: '❔',
	[Rating.EXEMPT]: '🆗',
}

/** Type predicate for `Rating`. */
export function isRating(value: unknown): value is Rating {
	return (
		value === Rating.UNRATED ||
		value === Rating.PASS ||
		value === Rating.PARTIAL ||
		value === Rating.FAIL ||
		value === Rating.EXEMPT
	)
}

/**
 * Convert a rating to the icon displayed on the slice tooltip.
 */
export function ratingToText(rating: Rating): string {
	switch (rating) {
		case Rating.PASS:
			return 'Pass'
		case Rating.PARTIAL:
			return 'Partial'
		case Rating.FAIL:
			return 'Fail'
		case Rating.UNRATED:
			return 'Unrated'
		case Rating.EXEMPT:
			return 'Exempt'
	}
}

/**
 * Convert a rating to the icon displayed on the slice tooltip.
 */
export function ratingToIcon(rating: Rating): string {
	switch (rating) {
		case Rating.FAIL:
			return '\u{274c}' // Red X
		case Rating.PARTIAL:
			return '\u{26a0}' // Warning sign
		case Rating.PASS:
			return '\u{2705}' // Green checkmark
		case Rating.UNRATED:
			return '\u{2753}' // Question mark
		case Rating.EXEMPT:
			return '\u{26aa}' // White circle
	}
}

/**
 * Convert a rating to a color.
 */
export function ratingToColor(rating: Rating): string {
	switch (rating) {
		case Rating.PASS:
			return 'var(--rating-pass)'
		case Rating.PARTIAL:
			return 'var(--rating-partial)'
		case Rating.FAIL:
			return 'var(--rating-fail)'
		case Rating.UNRATED:
			return 'var(--rating-unrated)'
		case Rating.EXEMPT:
			return 'var(--rating-neutral)'
	}
}

export function borderRatingToColor(rating: Rating): string {
	switch (rating) {
		case Rating.FAIL:
			return '#e74c3c' // Red
		case Rating.PARTIAL:
			return '#f1c40f' // Yellow
		case Rating.PASS:
			return '#2ecc71' // Green
		case Rating.UNRATED:
			return '#bdc3c7' // Gray
		case Rating.EXEMPT:
			return '#bdc3c7' // Gray
	}
}

/**
 * Value is one of multiple possible outcomes when evaluating an attribute.
 * It is *not* wallet-specific, and may often be enum-like.
 * For example, when evaluating an attribute like open-source licensing,
 * one particular Value could represent the Apache license, and another
 * could represent the MIT license.
 */
export interface Value {
	/**
	 * An ID representing the value.
	 * This needs to be unique within the set of possible values that the
	 * attribute may have, but does not need to be unique within the set of
	 * all values across all attributes.
	 * This can be used by rendering code to display value-specific content.
	 * For example, when evaluating an attribute like open-source licensing,
	 * the attribute of the value may be the ID of the license.
	 */
	id: string

	/**
	 * An icon that represents the *attribute* when this value is used to
	 * rate it. Optional, only used where it makes sense.
	 * For example, if an attribute has the "chain" icon, one of the ratings
	 * might use the "broken chain" icon.
	 */
	icon?: string

	/**
	 * A very short, human-readable explanation of this value.
	 * Used as tooltip when hovering over the attribute rating in the charts.
	 * This should relate to the attribute's displayName but stand on its own.
	 * For example, when evaluating an attribute like open-source licensing,
	 * this could say "Apache 2.0 license", not just "Apache 2.0" as that would
	 * be meaningless out of context.
	 */
	displayName: string

	/**
	 * A very short, human-readable explanation of this value.
	 * Should be similar to `displayName` but may be formatted with the name
	 * of the wallet.
	 */
	shortExplanation: Sentence<{
		WALLET_NAME: string
		WALLET_PSEUDONYM_SINGULAR: string | null
		WALLET_PSEUDONYM_PLURAL: string | null
	}>

	/**
	 * The visual representation of this value.
	 * For example, when evaluating an attribute like open-source licensing,
	 * this could say "PASS" if the wallet is Apache-licensed or MIT-licensed,
	 * "PARTIAL" if the wallet is BUSL-licensed, or "FAIL" if the wallet is
	 * proprietary.
	 */
	rating: Rating

	/**
	 * A score representing this value on this specific attribute.
	 * For any given Attribute, there should be at least one way to get a
	 * score of 1.0.
	 * If unspecified, the score is derived using `defaultRatingScore`.
	 */
	score?: Score
}

/** The numerical score corresponding to a rating by default. */
export function defaultRatingScore(rating: Rating): Score {
	switch (rating) {
		case Rating.FAIL:
			return 0.0
		case Rating.PARTIAL:
			return 0.5
		case Rating.PASS:
			return 1.0
	}
}

export interface EvaluationData<V extends Value> {
	value: V
	references: FullyQualifiedReference[]
	wallet: RatedWallet
}

/**
 * Evaluation is the result of evaluating how well a specific wallet fulfills
 * an attribute. Unlike Value, an Evaluation is wallet-specific.
 */
export interface Evaluation<V extends Value> {
	/**
	 * The value representing how well the wallet fulfills the attribute.
	 */
	value: V

	/**
	 * A long, human-readable explanation of this evaluation.
	 * Displayed on the per-wallet page.
	 * This can be more verbose but should still avoid repeating information
	 * already stated in the attribute explanation.
	 */
	details: Content<{ WALLET_NAME: string }>

	/**
	 * An optional paragraph explaining the consequence of this value on the
	 * user or to the wallet software.
	 * For example, when evaluating an attribute like open-source licensing,
	 * the "long explanation" should explain which license the wallet is using
	 * and why it does or does not meet FOSS criteria, whereas this paragraph
	 * should explain the upsides or downsides of FOSS licensing on the wallet
	 * software (e.g. "FOSS means more contributors").
	 */
	impact?: Paragraph<{ WALLET_NAME: string }>

	/**
	 * An optional paragraph or list of suggestions on what the wallet can do
	 * to improve this rating. Should only be populated for ratings that are
	 * not perfect.
	 */
	howToImprove?: TypographicContent<{
		WALLET_NAME: string
		WALLET_PSEUDONYM_SINGULAR: string | null
		WALLET_PSEUDONYM_PLURAL: string | null
	}>

	/**
	 * Optional array of references with URLs and explanations.
	 * These references provide sources for the evaluation claims.
	 */
	references?: ReferenceArray
}

/**
 * An evaluation that is exempt.
 */
export type ExemptEvaluation<V extends Value> = Evaluation<V> & {
	value: Evaluation<V>['value'] & {
		rating: Rating.EXEMPT
	}
}

/**
 * Type predicate for ExemptEvaluation.
 */
export function isExempt<V extends Value>(
	evaluation: Evaluation<V>,
): evaluation is ExemptEvaluation<V> {
	return evaluation.value.rating === Rating.EXEMPT
}

/**
 * A human-readable description of why a wallet may be assigned a certain
 * rating.
 */
export interface ExampleRating<V extends Value> {
	/**
	 * A description of why a hypothetical wallet may be assigned a specific
	 * rating.
	 * Must start with "The wallet " (possibly after whitespace) or
	 * "The wallet's ".
	 */
	description: Sentence | Paragraph

	/**
	 * Match function that determines whether the given `value` matches this
	 * example.
	 */
	matchesValue: (value: V) => boolean
}

/**
 * Attribute represents a desirable property that wallets should have.
 * It corresponds to one slice of the pie chart displayed for each wallet.
 * For example, an attribute could be about whether or not a wallet is
 * licensed under an open-source license.
 */
export interface Attribute<V extends Value> {
	/**
	 * Unique ID representing the attribute in camelCase.
	 * For example: "sourceVisibility".
	 */
	id: string

	/** An icon representing the attribute. Shown on rating charts. */
	icon: string

	/**
	 * A very short, human-readable title for the attribute.
	 * Should be no more than 3 or 4 words.
	 * Used in the context of section titles, so it should stand on its own
	 * outside of any sentence context, and should be capitalized appropriately.
	 */
	displayName: string

	wording:
		| {
				/**
				 * A very short, human-readable name for the attribute in a sentence.
				 * Should be no more than 3 or 4 words.
				 * Used in the context of mid-sentence descriptions. For example, the
				 * following string should make sense:
				 * "Is this wallet's ${midSentenceName} good or bad?"
				 * In most cases, a lowercase version of `displayName` will be appropriate.
				 * In more complex cases, this should be omitted and the more complex
				 * variation of `wording` should be used.
				 */
				midSentenceName: string
		  }
		| {
				/**
				 * midSentenceName can be set to `null` for more complex attribute
				 * names.
				 */
				midSentenceName: null

				/** The sentence "How is <attribute> evaluated?" */
				howIsEvaluated: string

				/** The sentence "What can <wallet> do about its <attribute>?" */
				whatCanWalletDoAboutIts: Sentence<{ WALLET_NAME: string }>
		  }

	/** A question explaining what question the attribute is answering. */
	question: Sentence<{ WALLET_NAME: string }>

	/** A paragraph explaining why this attribute is important to users. */
	why: TypographicContent

	/** General explanation of how wallets are rated on this attribute. */
	methodology: TypographicContent

	/** Explanations of what a wallet can do to achieve each rating. */
	ratingScale:
		| {
				/**
				 * The type of display used to render the rating scale.
				 * "simple" means to render a simple renderable block of text, useful for
				 * simple yes/no-type attributes.
				 */
				display: 'simple'

				/** The content to display to explain the rating scale. */
				content: TypographicContent
		  }
		| {
				/**
				 * The order in which each explanation below is displayed:
				 * - "pass-fail": Passing examples first, failing examples last
				 *   (partial examples in the middle, if any).
				 * - "fail-pass": Failing examples first, passing examples last
				 *   (partial examples in the middle, if any).
				 */
				display: 'pass-fail' | 'fail-pass'

				/**
				 * Whether the examples below exhaustively cover all cases that
				 * are possible. This affects the wording around the examples.
				 */
				exhaustive: boolean

				/** One or more ways in which a wallet can achieve a passing rating. */
				pass: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>

				/**
				 * Ways in which a wallet can achieve a partial rating.
				 * Unlike passing/failing, there may be zero ways to get a partial rating.
				 */
				partial?: ExampleRating<V> | Array<ExampleRating<V>>

				/** One or more ways in which a wallet can achieve a failing rating. */
				fail: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>
		  }

	/**
	 * Evaluate the attribute for a given set of wallet features.
	 * This function is the default way in which attributes are evaluated.
	 * However, a wallet may override the evaluation of an attribute using
	 * overrides.
	 *
	 * This function specifically does **not** take into account the wallet's
	 * metadata. This is to ensure that wallet ratings remain fair and unbiased
	 * by preventing their evaluation code from taking any metadata into
	 * account.
	 */
	evaluate: (features: ResolvedFeatures) => Evaluation<V>

	/**
	 * Check whether the attribute applies to a wallet, according to its
	 * features and metadata.
	 *
	 * This function is similar to `evaluate`, but may inspect wallet metadata.
	 * However, it can only return exempt ratings, or `null`.
	 * If it returns an exempt rating, then that rating is used and `evaluate`
	 * is not called. If it returns `null`, then `evaluate` is called.
	 *
	 * If `exempted` is undefined, then `evaluate` is used unconditionally.
	 */
	exempted?: (features: ResolvedFeatures, metadata: WalletMetadata) => null | ExemptEvaluation<V>

	/**
	 * Aggregates one or more per-variant evaluations into a single one.
	 * @param perVariant One or more per-variant evaluations.
	 * @returns The aggregated evaluation for these per-variant evaluations.
	 */
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<V>>) => Evaluation<V>
}

export interface EvaluatedAttribute<V extends Value> {
	attribute: Attribute<V>
	evaluation: Evaluation<V>
}

/**
 * A map of values. Should be a dictionary, i.e. its set of properties should
 * be fixed. Used to define attribute groups.
 */
export type ValueSet = NonEmptyRecord<string, Value>

/**
 * An attribute group is a collection of attributes that are related to one
 * another. For example, all attributes about privacy would be in the same
 * attribute group.
 */
export interface AttributeGroup<Vs extends ValueSet> {
	/** Unique ID of the attribute group. */
	id: string

	/** A friendly icon for the group. */
	icon: string

	/** A human-readable name for the group. */
	displayName: string

	/**
	 * A short question to which this attribute group is the answer.
	 * For example, for an attribute group about privacy, a good question
	 * might be "How well does {wallet} protect your privacy?".
	 */
	perWalletQuestion: Sentence<{ WALLET_NAME: string }>

	/** The actual set of attributes belonging to this group. */
	attributes: { [K in keyof Vs]: Attribute<Vs[K]> }

	/**
	 * The weights for each attribute when calculating the score for this attribute group.
	 */
	attributeWeights: { [K in keyof Vs]: number }
}

/**
 * An evaluated group is a collection of evaluated attributes that are related
 * to one another. For example, all evaluated attributed about privacy would
 * be in the same evaluation group.
 */
export type EvaluatedGroup<Vs extends ValueSet> = {
	[K in keyof Vs]: EvaluatedAttribute<Vs[K]>
}

/**
 * Convenience method to iterate over all evaluated attributes in a group.
 * @param evaluatedGroup The group to iterate over.
 * @returns An array of all the evaluated attributes in the group.
 */
export function evaluatedAttributes<Vs extends ValueSet>(
	evaluatedGroup: EvaluatedGroup<Vs>,
): NonEmptyArray<EvaluatedAttribute<Value>> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We know that ValueSets cannot be empty, therefore neither can this array.
	return Object.values(evaluatedGroup) as NonEmptyArray<EvaluatedAttribute<Value>>
}

/**
 * Convenience method to iterate over all evaluated attributes in a group as
 * entries.
 * @param evaluatedGroup The group to iterate over.
 * @returns An array of all the evaluated attribute entries in the group.
 */
export function evaluatedAttributesEntries<Vs extends ValueSet>(
	evaluatedGroup: EvaluatedGroup<Vs>,
): NonEmptyArray<[keyof Vs, EvaluatedAttribute<Value>]> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We know that ValueSets cannot be empty, therefore neither can this array.
	return Object.entries(evaluatedGroup) as NonEmptyArray<[keyof Vs, EvaluatedAttribute<Value>]>
}

/** Represents an unimplemented ExampleRating. See below. */
export const exampleRatingUnimplemented = 'UNIMPLEMENTED'

/**
 * Helper function to build an `ExampleRating`.
 * @param description The text description for the example rating.
 * @param matchers A non-empty set of example IDs, example values, ratings,
 *                 or match functions. The special string "UNIMPLEMENTED" may
 *                 also be used here, representing examples that would result
 *                 in this rating but for which the code to evaluate such
 *                 wallets does not exist yet (e.g. because it would currently
 *                 apply to no wallets).
 * @returns An ExampleRating that uses the given description and matchers.
 */
export function exampleRating<V extends Value>(
	description: ExampleRating<V>['description'],
	...matchers: NonEmptyArray<
		V['id'] | Rating | V | ((value: V) => boolean) | typeof exampleRatingUnimplemented
	>
): ExampleRating<V> {
	return {
		description,
		matchesValue: (value: V): boolean =>
			nonEmptyMap(matchers, matcher => {
				if (matcher === exampleRatingUnimplemented) {
					return false
				}

				if (isRating(matcher)) {
					return value.rating === matcher
				}

				if (typeof matcher === 'string') {
					return value.id === matcher
				}

				if (typeof matcher === 'function') {
					return matcher(value)
				}

				return matcher.id === value.id
			}).includes(true),
	}
}
