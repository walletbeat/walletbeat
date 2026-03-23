import type { Content, Paragraph, Sentence, TypographicContent } from '@/types/content'
import { type NonEmptyArray, nonEmptyMap, type NonEmptyRecord } from '@/types/utils/non-empty'

/** Strings for content that may use {{WALLET_NAME}} only (e.g. details, blurb). */
export type WalletNameStrings = null | { WALLET_NAME: string }

/** Strings for content that may use {{WALLET_NAME}} and/or pseudonym placeholders. */
export type WalletNameAndPseudonymStrings =
	| WalletNameStrings
	| {
			WALLET_NAME: string
			WALLET_PSEUDONYM_SINGULAR: string | null
			WALLET_PSEUDONYM_PLURAL: string | null
	  }

/**
 * Concrete wallet eval strings (all fields present, no null).
 * Used as return type of getWalletEvalStrings so it's assignable to Typography's
 * strings prop when content uses WalletNameAndPseudonymStrings (which is a union including null).
 */
export interface ConcreteWalletEvalStrings {
	WALLET_NAME: string
	WALLET_PSEUDONYM_SINGULAR: string
	WALLET_PSEUDONYM_PLURAL: string
}

import { Enum } from '@/utils/enum'

import type { ResolvedFeatures } from './features'
import { isMaybeSupported, isSupported, type Support } from './features/support'
import {
	type FullyQualifiedReference,
	hasRefs,
	type LooseReference,
	mergeRefs,
	popRefs,
	type ReferenceArray,
	type References,
	refs,
	toFullyQualified,
	type WithRef,
} from './reference'
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

/** A rating that is either pass/partial/fail. */
export type ExplicitRating = Rating.FAIL | Rating.PARTIAL | Rating.PASS

/**
 * Type predicate for `ExplicitRating`.
 */
export function isExplicitRating(rating: Rating): rating is ExplicitRating {
	switch (rating) {
		case Rating.PASS:
		case Rating.PARTIAL:
		case Rating.FAIL:
			return true
		case Rating.EXEMPT:
		case Rating.UNRATED:
			return false
	}
}

/** Ratings enum. */
export const ratingEnum = new Enum<Rating>({
	[Rating.PASS]: true,
	[Rating.PARTIAL]: true,
	[Rating.FAIL]: true,
	[Rating.UNRATED]: true,
	[Rating.EXEMPT]: true,
})

export const ratingIcons = {
	[Rating.PASS]: '✅',
	[Rating.PARTIAL]: '⚠️',
	[Rating.FAIL]: '❌',
	[Rating.UNRATED]: '❔',
	[Rating.EXEMPT]: '🆗',
} as const

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
 * The level of verifiability of the claims within an evaluation.
 *
 * Note that something being *verifiable*
 * does not mean that it has been *verified*.
 * This is only about the *ability* to be verified.
 */
export enum Verifiability {
	/**
	 * This claim does not require verification because it is self-evident.
	 *
	 * Applies by default to "UNRATED" ratings,
	 * since they are self-evidently correct.
	 */
	SELF_EVIDENT = 'SELF_EVIDENT',

	/**
	 * The claim has not been verified by anyone other than the wallet
	 * development team, and it is not possible to verify it by oneself.
	 */
	UNVERIFIABLE = 'UNVERIFIABLE',

	/**
	 * An independent auditor has verified this claim, but
	 * a member of the general public has no means to verify this for
	 * themselves.
	 */
	INDEPENDENTLY_AUDITED = 'INDEPENDENTLY_AUDITED',

	/**
	 * This claim is publicly verifiable by a member of the general public.
	 */
	VERIFIABLE = 'VERIFIABLE',

	/**
	 * The data needed to know whether something is verifiable is itself not
	 * known. For example, if verification requires source-code-level access,
	 * but we do not have information on whether the wallet's source code is
	 * available, then `Verifiability` would be `UNKNOWN`.
	 */
	UNKNOWN = 'UNKNOWN',
}

/** Enum helper for `Verifiability`. */
export const verifiabilityEnum = new Enum<Verifiability>({
	[Verifiability.SELF_EVIDENT]: true,
	[Verifiability.UNVERIFIABLE]: true,
	[Verifiability.INDEPENDENTLY_AUDITED]: true,
	[Verifiability.VERIFIABLE]: true,
	[Verifiability.UNKNOWN]: true,
})

/**
 * Base type for attribute-specific metadata added to Value.
 * Attributes pass only their custom fields as the generic; Value is implicit.
 */
export type OutcomeMetadata = object

/**
 * Value is one of multiple possible outcomes when evaluating an attribute.
 * It is *not* wallet-specific, and may often be enum-like.
 * For example, when evaluating an attribute like open-source licensing,
 * one particular Value could represent the Apache license, and another
 * could represent the MIT license.
 */
export type Outcome<_OutcomeMetadata extends OutcomeMetadata = {}> = {
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
	shortExplanation: Sentence<WalletNameStrings>

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

	/**
	 * Attribute-specific metadata. Optional; only present when the attribute
	 * has metadata beyond the base outcome fields.
	 */
	metadata?: {} extends _OutcomeMetadata ? undefined : _OutcomeMetadata
} & (
	| {
			rating: ExplicitRating
			// If explicit rating, need to provide verifiability.

			/**
			 * How verifiable the rating is by the general public.
			 *
			 * Some attributes can self-evidently be verified by just using the wallet
			 * (e.g. "what happens if I type an ENS address when sending tokens?"),
			 * whereas others require source-level access to ascertain ("how is private
			 * key material handled?"), or even beyond ("what happens to my orderflow
			 * data after I send this transaction request to the wallet's default RPC
			 * provider?").
			 *
			 * Note that something being *verifiable*
			 * does not mean that it has been *verified*.
			 * This is only about the *ability* to be verified.
			 */
			verifiability: Verifiability
	  }
	| {
			rating: Exclude<Rating, ExplicitRating>
			// If EXEMPT or UNRATED, the verifiability is self-evident.
			verifiability: Verifiability.SELF_EVIDENT
	  }
)

/** The numerical score corresponding to a rating by default. */
export function defaultRatingScore(value: Outcome): Score {
	switch (value.rating) {
		case Rating.FAIL:
			return 0.0
		case Rating.PARTIAL:
			switch (value.verifiability) {
				case Verifiability.UNVERIFIABLE:
					return 0.05
				case Verifiability.INDEPENDENTLY_AUDITED:
					return 0.2
				default:
					return 0.5
			}
		case Rating.PASS:
			switch (value.verifiability) {
				case Verifiability.UNVERIFIABLE:
					return 0.1
				case Verifiability.INDEPENDENTLY_AUDITED:
					return 0.7
				default:
					return 1.0
			}
		case Rating.EXEMPT:
			return null
		case Rating.UNRATED:
			return -0.5
	}
}

/** Compare two explicit ratings. Suitable for using in sort functions. */
export function compareExplicitRatings(rating1: ExplicitRating, rating2: ExplicitRating): number {
	const score = (rating: ExplicitRating): number => {
		switch (rating) {
			case Rating.FAIL:
				return 0
			case Rating.PARTIAL:
				return 1
			case Rating.PASS:
				return 2
		}
	}

	return score(rating1) - score(rating2)
}

export interface EvaluationData<_OutcomeMetadata extends OutcomeMetadata = {}> {
	outcome: Outcome<_OutcomeMetadata>
	references: FullyQualifiedReference[]
	wallet: RatedWallet
}

/**
 * Evaluation is the result of evaluating how well a specific wallet fulfills
 * an attribute. Unlike Value, an Evaluation is wallet-specific.
 */
export interface Evaluation<_OutcomeMetadata extends OutcomeMetadata = {}> {
	/**
	 * The outcome representing how well the wallet fulfills the attribute.
	 */
	outcome: Outcome<_OutcomeMetadata>

	/**
	 * A long, human-readable explanation of this evaluation.
	 * Displayed on the per-wallet page.
	 * This can be more verbose but should still avoid repeating information
	 * already stated in the attribute explanation.
	 */
	details: Content<WalletNameStrings>

	/**
	 * An optional paragraph explaining the consequence of this value on the
	 * user or to the wallet software.
	 * For example, when evaluating an attribute like open-source licensing,
	 * the "long explanation" should explain which license the wallet is using
	 * and why it does or does not meet FOSS criteria, whereas this paragraph
	 * should explain the upsides or downsides of FOSS licensing on the wallet
	 * software (e.g. "FOSS means more contributors").
	 */
	impact?: TypographicContent<WalletNameStrings>

	/**
	 * An optional paragraph or list of suggestions on what the wallet can do
	 * to improve this rating. Should only be populated for ratings that are
	 * not perfect.
	 */
	howToImprove?: TypographicContent<WalletNameAndPseudonymStrings>

	/**
	 * Optional array of references with URLs and explanations.
	 * These references provide sources for the evaluation claims.
	 */
	references?: ReferenceArray
}

/**
 * An evaluation that is exempt.
 */
export type ExemptEvaluation<_OutcomeMetadata extends OutcomeMetadata = {}> =
	Evaluation<_OutcomeMetadata> & {
		outcome: Evaluation<_OutcomeMetadata>['outcome'] & {
			rating: Rating.EXEMPT
		}
	}

/**
 * Type predicate for ExemptEvaluation.
 */
export function isExempt<_OutcomeMetadata extends OutcomeMetadata = {}>(
	evaluation: Evaluation<_OutcomeMetadata>,
): evaluation is ExemptEvaluation<_OutcomeMetadata> {
	return evaluation.outcome.rating === Rating.EXEMPT
}

/**
 * A human-readable description of why a wallet may be assigned a certain
 * rating.
 */
export interface ExampleRating<_OutcomeMetadata extends OutcomeMetadata = {}> {
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
	matchesValue: (value: Outcome<_OutcomeMetadata>) => boolean

	/**
	 * Sample evaluations for this rating. Optional, may be empty.
	 */
	sampleEvaluations: Evaluation<_OutcomeMetadata>[]
}

/**
 * Normalize example ratings to an array (single item or undefined becomes array).
 */
export function normalizeExampleRatings<_OutcomeMetadata extends OutcomeMetadata = {}>(
	ratings: ExampleRating<_OutcomeMetadata> | ExampleRating<_OutcomeMetadata>[] | undefined,
): ExampleRating<_OutcomeMetadata>[] {
	if (ratings === undefined) {
		return []
	}

	return Array.isArray(ratings) ? ratings : [ratings]
}

/**
 * Attribute represents a desirable property that wallets should have.
 * It corresponds to one slice of the pie chart displayed for each wallet.
 * For example, an attribute could be about whether or not a wallet is
 * licensed under an open-source license.
 */
export interface Attribute<_OutcomeMetadata extends OutcomeMetadata = {}> {
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
				whatCanWalletDoAboutIts: Sentence<WalletNameStrings>
		  }

	/** A question explaining what question the attribute is answering. */
	question: Sentence<WalletNameStrings>

	/** A paragraph explaining why this attribute is important to users. */
	why: TypographicContent<WalletNameStrings>

	/** General explanation of how wallets are rated on this attribute. */
	methodology: TypographicContent<WalletNameStrings>

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
				content: TypographicContent<WalletNameAndPseudonymStrings>
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
				pass: ExampleRating<_OutcomeMetadata> | NonEmptyArray<ExampleRating<_OutcomeMetadata>>

				/**
				 * Ways in which a wallet can achieve a partial rating.
				 * Unlike passing/failing, there may be zero ways to get a partial rating.
				 */
				partial?: ExampleRating<_OutcomeMetadata> | Array<ExampleRating<_OutcomeMetadata>>

				/** One or more ways in which a wallet can achieve a failing rating. */
				fail: ExampleRating<_OutcomeMetadata> | NonEmptyArray<ExampleRating<_OutcomeMetadata>>
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
	evaluate: (ctx: EvaluationContext<_OutcomeMetadata>) => Evaluation<_OutcomeMetadata>

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
	exempted?: (
		ctx: EvaluationContext<_OutcomeMetadata>,
		metadata: WalletMetadata,
	) => null | ExemptEvaluation<_OutcomeMetadata>

	/**
	 * Aggregates one or more per-variant evaluations into a single one.
	 * @param perVariant One or more per-variant evaluations.
	 * @returns The aggregated evaluation for these per-variant evaluations.
	 */
	aggregate: (
		perVariant: AtLeastOneVariant<Evaluation<_OutcomeMetadata>>,
	) => Evaluation<_OutcomeMetadata>
}

export interface EvaluatedAttribute<_OutcomeMetadata extends OutcomeMetadata = {}> {
	attribute: Attribute<_OutcomeMetadata>
	evaluation: Evaluation<_OutcomeMetadata>
}

/**
 * `EvaluationScaffold<_OutcomeMetadata>` is a mostly-build `Evaluation<_OutcomeMetadata>`,
 * which `EvaluationContext<_OutcomeMetadata>` can build into a full `Evaluation<_OutcomeMetadata>`.
 */
export type EvaluationScaffold<_OutcomeMetadata extends OutcomeMetadata = {}> = Omit<
	Evaluation<_OutcomeMetadata>,
	'outcome'
> & {
	outcome: Omit<Outcome<_OutcomeMetadata>, 'verifiability'>
}

/** A function that takes a wallet's evaluation context and returns a `Verifiability`. */
export type VerifiabilityPredicate<_OutcomeMetadata extends OutcomeMetadata = {}> = (
	ctx: EvaluationContext<_OutcomeMetadata>,
) => Verifiability

/**
 * EvaluationContext is a helper class to build `Evaluation<_OutcomeMetadata>` objects,
 * keeping track of their references and verifiability. It is a stateful
 * object which is progressively populated as the evaluation progresses,
 * then `build` is called to finalize the `Evaluation<_OutcomeMetadata>`.
 */
export class EvaluationContext<_OutcomeMetadata extends OutcomeMetadata = {}> {
	private readonly attributeFn: () => Attribute<_OutcomeMetadata>
	private readonly rawReferences: FullyQualifiedReference[]
	private readonly featuresOrNull: ResolvedFeatures | null
	private verifiability: Verifiability | VerifiabilityPredicate<_OutcomeMetadata> | null
	private isForTest: boolean = false

	/**
	 * `forTest` returns an EvaluationContext which is used in tests.
	 * Such contexts will assume all `Evaluation`s are verifiable.
	 */
	public static forTest<_OutcomeMetadata extends OutcomeMetadata = {}>(
		attributeFn: () => Attribute<_OutcomeMetadata>,
	): EvaluationContext<_OutcomeMetadata> {
		const ctx = new EvaluationContext<_OutcomeMetadata>(attributeFn, null, true)

		ctx.isForTest = true

		return ctx
	}

	public static create<_OutcomeMetadata extends OutcomeMetadata = {}>(
		attribute: Attribute<_OutcomeMetadata>,
		features: ResolvedFeatures,
	): EvaluationContext<_OutcomeMetadata> {
		const ctx = new EvaluationContext<_OutcomeMetadata>(() => attribute, features, false)

		ctx.isForTest = true

		return ctx
	}

	private constructor(
		attributeFn: () => Attribute<_OutcomeMetadata>,
		features: ResolvedFeatures | null,
		isForTest: boolean,
	) {
		this.attributeFn = attributeFn
		this.featuresOrNull = features
		this.rawReferences = []
		this.verifiability = null
		this.isForTest = isForTest
	}

	private _addRef(
		x:
			| undefined
			| null
			| WithRef<unknown>
			| Support<WithRef<object>>
			| LooseReference
			| References
			| FullyQualifiedReference
			| FullyQualifiedReference[],
	) {
		if (x === null || x === undefined) {
			return
		}

		if (Array.isArray(x)) {
			this.addRef(...x)

			return
		}

		if (isMaybeSupported(x)) {
			if (isSupported(x)) {
				this.addRef(...toFullyQualified(x.ref))
			}

			return
		}

		if (hasRefs(x)) {
			this.addRef(...refs(x))

			return
		}

		for (const ref of toFullyQualified(x)) {
			this.rawReferences.push(ref)
		}
	}

	/** Add one or more references. */
	public addRef(
		...x: (
			| WithRef<unknown>
			| Support<WithRef<object>>
			| LooseReference
			| References
			| FullyQualifiedReference
			| FullyQualifiedReference[]
			| undefined
			| null
		)[]
	) {
		for (const item of x) {
			this._addRef(item)
		}
	}

	/**
	 * Extract references from `x` into current context,
	 * then return `x` with references removed.
	 */
	public popRefs<T>(x: WithRef<T>): T {
		const { withoutRefs, refs } = popRefs(x)

		this.addRef(...refs)

		return withoutRefs
	}

	/** Set the `verifiability` value that will be used for PASS/PARTIAL ratings. */
	public setVerifiability(verifiability: Verifiability | VerifiabilityPredicate<_OutcomeMetadata>) {
		this.verifiability = verifiability
	}

	/** The set of wallet features being evaluated. */
	public get features(): ResolvedFeatures {
		if (this.featuresOrNull === null) {
			throw new Error('tried to get ResolvedFeatures out of testing context')
		}

		return this.featuresOrNull
	}

	/** The attribute being evaluated. */
	public get attribute(): Attribute<_OutcomeMetadata> {
		return this.attributeFn()
	}

	/** The references gathered so far. */
	public references(): FullyQualifiedReference[] {
		return mergeRefs(this.rawReferences)
	}

	/** Build an `Evaluation<_OutcomeMetadata>` out of an `EvaluationScaffold<_OutcomeMetadata>`. */
	public build(scaffold: EvaluationScaffold<_OutcomeMetadata>): Evaluation<_OutcomeMetadata> {
		const otherRefs = scaffold.references ?? []
		const finalRefs = mergeRefs(otherRefs, this.rawReferences)
		let verifiability =
			this.verifiability === null
				? this.isForTest
					? Verifiability.VERIFIABLE
					: null
				: this.verifiability
		const val = ((): Outcome<_OutcomeMetadata> => {
			const scaffoldVal: Omit<Outcome<_OutcomeMetadata>, 'verifiability'> = scaffold.outcome

			if (!isExplicitRating(scaffoldVal.rating)) {
				return {
					...scaffoldVal,
					rating: scaffoldVal.rating,
					verifiability: Verifiability.SELF_EVIDENT,
				} as Outcome<_OutcomeMetadata>
			}

			if (verifiability === null) {
				throw new Error('verifiability is unset for PASS rating')
			}

			if (!verifiabilityEnum.is(verifiability)) {
				if (this.features === null) {
					throw new Error(
						'tried to use a VerifiabilityPredicate without specifying wallet features',
					)
				}

				verifiability = verifiability(this)
			}

			// Now we must be dealing with a `Verifiability` value.
			verifiabilityEnum.assert(verifiability)

			return {
				...scaffoldVal,
				rating: scaffoldVal.rating,
				verifiability,
			} as Outcome<_OutcomeMetadata>
		})()

		return {
			...{
				...scaffold,
				outcome: val,
			},
			...(finalRefs.length === 0 ? {} : { references: finalRefs }),
		}
	}
}

/**
 * A map of attribute IDs to their outcome metadata. Used to define attribute groups.
 */
export type ValueSet = NonEmptyRecord<string, OutcomeMetadata>

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
	perWalletQuestion: Sentence<WalletNameStrings>

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
): NonEmptyArray<EvaluatedAttribute<OutcomeMetadata>> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We know that ValueSets cannot be empty, therefore neither can this array.
	return Object.values(evaluatedGroup) as unknown as NonEmptyArray<
		EvaluatedAttribute<OutcomeMetadata>
	>
}

/**
 * Convenience method to iterate over all evaluated attributes in a group as
 * entries.
 * @param evaluatedGroup The group to iterate over.
 * @returns An array of all the evaluated attribute entries in the group.
 */
export function evaluatedAttributesEntries<Vs extends ValueSet>(
	evaluatedGroup: EvaluatedGroup<Vs>,
): NonEmptyArray<[keyof Vs, EvaluatedAttribute<OutcomeMetadata>]> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We know that ValueSets cannot be empty, therefore neither can this array.
	return Object.entries(evaluatedGroup) as unknown as NonEmptyArray<
		[keyof Vs, EvaluatedAttribute<OutcomeMetadata>]
	>
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
export function exampleRating<_OutcomeMetadata extends OutcomeMetadata = {}>(
	description: ExampleRating<_OutcomeMetadata>['description'],
	...matchers: NonEmptyArray<
		| Outcome<_OutcomeMetadata>['id']
		| Rating
		| Evaluation<_OutcomeMetadata>
		| ((value: Outcome<_OutcomeMetadata>) => boolean)
		| typeof exampleRatingUnimplemented
	>
): ExampleRating<_OutcomeMetadata> {
	const sampleEvaluations: Evaluation<_OutcomeMetadata>[] = []

	for (const matcher of matchers) {
		if (
			matcher !== exampleRatingUnimplemented &&
			!ratingEnum.is(matcher) &&
			typeof matcher === 'object'
		) {
			sampleEvaluations.push(matcher)
		}
	}

	return {
		description,
		matchesValue: (value: Outcome<_OutcomeMetadata>): boolean =>
			nonEmptyMap(matchers, matcher => {
				if (matcher === exampleRatingUnimplemented) {
					return false
				}

				if (ratingEnum.is(matcher)) {
					return value.rating === matcher
				}

				if (typeof matcher === 'string') {
					return value.id === matcher
				}

				if (typeof matcher === 'function') {
					return matcher(value)
				}

				return matcher.outcome.id === value.id
			}).includes(true),
		sampleEvaluations,
	}
}

/**
 * Format title text for an attribute pie slice.
 * @param attribute The evaluated attribute to format.
 * @param suffix Optional suffix to append to the title.
 * @returns Formatted title text in the format: "(icon) title [(eval icon) EVAL VALUE]\n\n(displayName)"
 */
export const formatAttributeTitleText = (
	attribute: EvaluatedAttribute<OutcomeMetadata>,
	suffix?: string,
) =>
	`${attribute.evaluation.outcome.icon ?? attribute.attribute.icon} ${
		attribute.attribute.displayName
	}${suffix ?? ''} [${ratingIcons[attribute.evaluation.outcome.rating]} ${
		attribute.evaluation.outcome.rating
	}]${
		![Rating.EXEMPT, Rating.UNRATED].includes(attribute.evaluation.outcome.rating)
			? `\n\n${attribute.evaluation.outcome.displayName}`
			: ''
	}`
