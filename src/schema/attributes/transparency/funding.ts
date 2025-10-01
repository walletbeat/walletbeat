import {
	type Attribute,
	type Evaluation,
	exampleRating,
	exampleRatingUnimplemented,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type Monetization,
	monetizationStrategies,
	type MonetizationStrategy,
	monetizationStrategyIsUserAligned,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import { toFullyQualified } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'
import { fundingDetailsContent } from '@/types/content/funding-details'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transparency.funding'

export type FundingValue = Value & {
	__brand: 'attributes.transparency.funding'
}

/** Funding is transparent and at least partially non-extractive. */
function transparent(
	id: string,
	sourceName: string,
	monetization: Monetization,
): Evaluation<FundingValue> {
	return {
		value: {
			id: `transparent_${id.toLocaleLowerCase()}`,
			rating: Rating.PASS,
			displayName: `Transparent funding (${sourceName})`,
			shortExplanation: sentence('{{WALLET_NAME}} is transparently funded.'),
			__brand: brand,
		},
		details: fundingDetailsContent({ monetization }),
		references: toFullyQualified(monetization.ref),
	}
}

/** Funding is entirely extractive. */
function extractive(
	id: string,
	sourceName: string,
	monetization: Monetization,
): Evaluation<FundingValue> {
	return {
		value: {
			id: `extractive_${id.toLocaleLowerCase()}`,
			rating: Rating.PARTIAL,
			icon: '\u{1f911}', // Money mouth face
			displayName: `User-extractive funding${sourceName !== '' ? ` (${sourceName})` : ''}`,
			shortExplanation: sentence(
				`{{WALLET_NAME}} is funded through user-extractive means${sourceName !== '' ? ` (${sourceName})` : ''}.`,
			),
			__brand: brand,
		},
		details: fundingDetailsContent({ monetization }),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should change its funding sources to non-user-extractive means such as transparent convenience fees, donations, or ecosystem grants.',
		),
		references: toFullyQualified(monetization.ref),
	}
}

/** Wallet has no funding. */
const noFunding: Evaluation<FundingValue> = {
	value: {
		id: 'noFunding',
		rating: Rating.FAIL,
		displayName: 'No funding source',
		shortExplanation: sentence('{{WALLET_NAME}} has no funding sources.'),
		__brand: brand,
	},
	details: paragraph(
		'{{WALLET_NAME}} has no funding sources, making its future unclear. Wallets need a consistent source of funding to ensure they keep up with security vulnerabilities and ecosystem progress.',
	),
	howToImprove: paragraph(
		'While most software projects inevitably start small and unfunded, {{WALLET_NAME}} should seek a reliable source of funding once feasible.',
	),
	references: [],
}

/** Funding is not transparent. */
const unclear: Evaluation<FundingValue> = {
	value: {
		id: 'unclear',
		rating: Rating.FAIL,
		displayName: 'Unclear funding source',
		shortExplanation: sentence('How {{WALLET_NAME}} is funded is unclear.'),
		__brand: brand,
	},
	details: paragraph('How {{WALLET_NAME}} is funded is unclear.'),
	howToImprove: paragraph(
		'{{WALLET_NAME}} should publish how it is funded, or how it plans to fund itself.',
	),
	references: [],
}

/**
 * Funding encodes the transparency and user-alignment of the monetization
 * strategies employed by the wallet.
 *
 * The "user alignment" of a monetization strategy refers to whether the
 * funding that goes to the wallet development team grows as a function
 * of the user's own goals, rather than being uncorrelated or
 * anti-correlated.
 *
 * If a wallet's monetization strategy is unclear to the public, then it
 * is not transparent.
 *
 * If a wallet has one or more monetization strategies and all of them are
 * user-aligned, then the wallet is deemed transparent.
 *
 * If a wallet has one or more monetization strategies, but all or some of
 * them are not user-aligned, and does not publish a breakdown of its
 * revenue, then the wallet is deemed "extractive".
 * This is better than "unclear", because at least the funding sources are
 * known. In order to get out of this state and be deemed "transparent", a
 * wallet needs to publish the revenue breakdown that it earns from each of
 * its monetization strategies.
 */
export const funding: Attribute<FundingValue> = {
	id: 'funding',
	icon: '\u{1fa99}', // Coin
	displayName: 'Funding',
	wording: {
		midSentenceName: 'funding',
	},
	question: sentence("How is the wallet's development team funded?"),
	why: paragraph(`
		Wallets are complex, high-stakes pieces of software.
		They must be maintained, regularly audited, and follow the continuous
		improvements in the ecosystem.
		This requires a reliable, transparent source of funding.
	`),
	methodology: markdown(`
		Wallets are assessed based on how sustainable, transparent, and
		user-aligned their funding mechanisms are.

		Wallets are typically funded by one or more of the following methods:

		* Self-funding from developers
		* Seeking donations from users
		* Seeking grants from foundations
		* Venture capital funding
		* Charging fees on convenience functions (e.g. swapping and bridging
			tokens)
		* Governance tokens
		* Commemorative NFT sales

		Walletbeat looks at each funding source of funding and verifies whether
		it is done transparently and in a user-aligned manner. In this context,
		"user alignment" refers to whether a source of funding grows as a
		function of the user's own goals, rather than being uncorrelated or
		anti-correlated. For example, funding acquired through hidden swap fees
		or governance token sales with undisclosed insider token allocations are
		not user-aligned. Funding acquired through transparent swap fees, user
		donations, or ecosystem grants are user-aligned.

		In order to pass this criterion, wallets must have at least one source of
		funding, and all of their sources of funding must be transparent to users.
		Additionally, if the wallet is funded from multiple sources and some of
		these sources are not user-aligned, the public must be able to determine
		the proportion of each such funding source to the wallet's overall
		revenue. Depending on the funding mechanism, this can be done through
		publication of a revenue breakdown page, public regulatory filings,
		or token allocation and vesting disclosures.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph(
					'The wallet has funding but has not revealed this publicly and transparently to users.',
				),
				unclear.value,
			),
			exampleRating(
				paragraph(
					'The wallet does not have any funding. Wallets must have sustainable funding sources in order to remain secure and up-to-date.',
				),
				noFunding.value,
			),
		],
		partial: [
			exampleRating(
				paragraph(
					'The wallet is funded from hidden swap fees. While users can look this up onchain to see how much revenue the wallet is generating from this, making this funding source technically transparent, it is not user-aligned.',
				),
				exampleRatingUnimplemented,
			),
			exampleRating(
				paragraph(
					'The wallet is funded from user-visible swap fees and governance token sales with undisclosed vesting schedule. While users can use onchain lookups to determine how much revenue is generated from both sources, making the funding technically transparent, the undisclosed nature of governance token makes makes this not user-aligned.',
				),
				exampleRatingUnimplemented,
			),
		],
		pass: [
			exampleRating(
				paragraph(
					'The wallet is funded from user-visible swap fees and pre-disclosed governance token sales.',
				),
				exampleRatingUnimplemented,
			),
			exampleRating(
				paragraph(
					'The wallet is funded from venture capital and publishes regulatory filings showing the amount raised in each round and the top investors of each round.',
				),
				exampleRatingUnimplemented,
			),
			exampleRating(
				paragraph(
					'The wallet is funded from onchain donations, onchain ecosystem grants, and commemorative NFT sales.',
				),
				exampleRatingUnimplemented,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<FundingValue> => {
		if (features.monetization === null) {
			return unrated(funding, brand, null)
		}

		const strategies: MonetizationStrategy[] = []

		for (const { strategy, value } of monetizationStrategies(features.monetization)) {
			switch (value) {
				case null:
					return unrated(funding, brand, null)
				case true:
					strategies.push(strategy)
					break
				case false:
					break // Do nothing.
			}
		}
		const numStrategies = strategies.length

		if (numStrategies === 0) {
			return unclear
		}

		const extractiveStrategies = []
		const userAlignedStrategies = []

		for (const strategy of strategies) {
			if (monetizationStrategyIsUserAligned(strategy)) {
				userAlignedStrategies.push(strategy)
			} else {
				extractiveStrategies.push(strategy)
			}
		}

		if (!features.monetization.revenueBreakdownIsPublic && extractiveStrategies.length > 0) {
			if (extractiveStrategies.length === 1) {
				return extractive(
					extractiveStrategies[0],
					monetizationStrategyName(extractiveStrategies[0]),
					features.monetization,
				)
			}

			return extractive('multi', '', features.monetization)
		}

		if (numStrategies === 1) {
			return transparent(
				strategies[0],
				monetizationStrategyName(strategies[0]),
				features.monetization,
			)
		}

		return transparent('multi', 'Multiple sources', features.monetization)
	},
	aggregate: pickWorstRating<FundingValue>,
}
