import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import type {
	ChainAbstraction,
	CrossChainBalanceDisplay,
} from '@/schema/features/ecosystem/chain-abstraction'
import {
	featureSupported,
	featureSupportedNoRef,
	isSupported,
	notSupported,
	supported,
} from '@/schema/features/support'
import {
	comprehensiveFeesShownByDefault,
	FeeDisplayLevel,
} from '@/schema/features/transparency/fee-display'
import { mergeRefs, refNotNecessary, refs } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type ChainAbstractionValue = Value

function evaluateChainAbstraction(
	chainAbstraction: ChainAbstraction,
): Evaluation<ChainAbstractionValue> {
	const { crossChainBalances, bridging } = chainAbstraction

	const references = mergeRefs(
		refs(crossChainBalances),
		isSupported(bridging.builtInBridging) ? refs(bridging.builtInBridging) : [],
		isSupported(bridging.suggestedBridging) ? refs(bridging.suggestedBridging) : [],
	)

	// FAIL conditions follow.

	if (!isSupported(crossChainBalances.globalAccountValue)) {
		return {
			value: {
				id: 'chain_abstraction_no_global_account_value',
				displayName: 'No cross-chain awareness',
				rating: Rating.FAIL,
				shortExplanation: sentence(
					"{{WALLET_NAME}} does not display your account's total value across chains.",
				),
			},
			details: markdown(`
				{{WALLET_NAME}} does not display your account's total value across
				chains. This is a one of many features that wallets need to
				implement in order to be multi-chain-aware, which is important to
				the Ethereum L2 roadmap to make L2s seamless for users.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should implement more cross-chain features, such as:

				- Displaying account value across chains
				- Displaying token balances across chains
				- Transparent cross-chain bridging
				- etc.
			`),
			references,
		}
	}

	if (
		!isSupported(crossChainBalances.ether.perChainBalanceViewAcrossMultipleChains) ||
		!isSupported(crossChainBalances.usdc.perChainBalanceViewAcrossMultipleChains)
	) {
		return {
			value: {
				id: 'chain_abstraction_no_per_chain_balance_view_across_multiple_chains',
				displayName: 'No per-chain token balance view',
				rating: Rating.FAIL,
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not display token balances across chains.',
				),
			},
			details: markdown(`
				While {{WALLET_NAME}} can display your account's total value across
				chains, it does not let you see your token balance (e.g. Ether or
				USDC) across multiple chains at once. This makes it difficult for you
				as a user to determine, for example, how much USDC you have.

				Cross-chain token balance awareness is a one of many features that
				wallets need to implement in order to be multi-chain-aware,
				which is important to the Ethereum L2 roadmap to make L2s seamless
				for users.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should implement more cross-chain features, such as:

				- Displaying account value across chains
				- Displaying token balances across chains
				- Transparent cross-chain bridging
				- etc.
			`),
			references,
		}
	}

	if (!isSupported(bridging.builtInBridging)) {
		return {
			value: {
				id: 'chain_abstraction_no_bridging',
				displayName: 'No cross-chain bridging support',
				rating: Rating.FAIL,
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not provide an easy cross-chain bridging feature.',
				),
			},
			details: markdown(`
				{{WALLET_NAME}} does not provide a built-in way to bridge assets
				from one chain to another. This is a critical feature for
				Ethereum's L2 roadmap in order to minimize UX friction when dealing
				with the reality of multiple chains on top of Ethereum.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should add a built-in bridging feature.
			`),
			references,
		}
	}

	// PARTIAL conditions follow.

	if (
		!isSupported(crossChainBalances.ether.crossChainSumView) ||
		!isSupported(crossChainBalances.usdc.crossChainSumView)
	) {
		return {
			value: {
				id: 'chain_abstraction_no_cross_chain_token_balance_sum',
				displayName: 'No cross-chain token balance',
				rating: Rating.PARTIAL,
				shortExplanation: sentence('{{WALLET_NAME}} does not add up token balances across chains.'),
			},
			details: markdown(`
				While {{WALLET_NAME}} can display your account's total value across
				chains, as well as individual per-chain token balances, it does not
				let you see your total token balance (for example: Ether or
				USDC) summed up across multiple chains. This makes it difficult for
				you as a user to determine, for example, how much USDC you have.

				Cross-chain token balance awareness is a one of many features that
				wallets need to implement in order to be multi-chain-aware,
				which is important to the Ethereum L2 roadmap to make L2s seamless
				for users.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should have a way to see token balances summed up
				across chains.
			`),
			references,
		}
	}

	if (bridging.builtInBridging.feesLargerThan1bps.byDefault === FeeDisplayLevel.NONE) {
		const feesHidden =
			bridging.builtInBridging.feesLargerThan1bps.afterSingleAction === FeeDisplayLevel.NONE

		return {
			value: {
				id: feesHidden
					? 'chain_abstraction_bridge_hidden_fees'
					: 'chain_abstraction_bridge_non_transparent_fees',
				displayName: feesHidden
					? 'Hidden cross-chain bridging fees'
					: 'Non-transparent cross-chain bridging fees',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(`
					{{WALLET_NAME}} implements cross-chain bridging,
					but does not display the fees involved in doing
					so${feesHidden ? '' : ' by default'}.
				`),
			},
			details: markdown(`
				{{WALLET_NAME}} has a built-in cross-chain bridging feature, but
				it does not display the fees involved in using this bridging
				feature${feesHidden ? '' : ' by default'}.
				You as a user deserve to know where your money is going.

				Cross-chain bridges inevitably involve one or more types of fees,
				such as:

				- Gas fees of the chain funds are sent from
				- Bridging service fees
				- Cross-chain liquidity provider fees
				- (Sometimes) Gas fees of the chain funds are sent to
				- Wallet development teams may also add a fee on top of the
					wallet's native bridging feature.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should display the fees involved in using its
				bridging feature by default.
				While it may already display the expected amount received on
				the target chain, you as a user should be able to know who
				this fee is going to, broken down between all the parties that
				take a cut.
			`),
			references,
		}
	}

	if (
		bridging.builtInBridging.risksExplained === 'NOT_IN_UI' ||
		bridging.builtInBridging.risksExplained === 'HIDDEN_BY_DEFAULT'
	) {
		const risksHidden = bridging.builtInBridging.risksExplained === 'NOT_IN_UI'

		return {
			value: {
				id: risksHidden
					? 'chain_abstraction_bridge_hidden_risks'
					: 'chain_abstraction_bridge_non_transparent_risks',
				displayName: risksHidden
					? 'Hidden cross-chain bridging risks'
					: 'Non-transparent cross-chain bridging risks',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(`
					{{WALLET_NAME}} implements cross-chain bridging,
					but does not
					${risksHidden ? 'straightforwardly display' : 'display'}
					the risks involved in doing so.
				`),
			},
			details: markdown(`
				{{WALLET_NAME}} has a built-in cross-chain bridging feature, but
				it does not display the risks involved in using this bridging
				feature${risksHidden ? '' : ' by default'}.
				You as a user deserve to know the risks involved in bridging your
				assets.

				Cross-chain bridges inevitably involve one or more types of risks,
				such as:

				- Insufficient liquidity on the target chain
				- Bridge correctness failure
				- Risks involved in wrapped assets (when applicable)
				- Risks involved in L2-to-L2 interoperability (when applicable)

				Bridging assets to an L2 chain also inherently implies accepting the
				risk of that L2 chain, which [our friends at L2BEAT](https://l2beat/)
				do a great job documenting.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should display the risks involved in using its
				bridging feature by default. These are
				[well-documented on L2BEAT](https://l2beat.com/). However, wallet
				developers also have a responsibility to make these risks known to
				users when they bridge assets.
			`),
			references,
		}
	}

	if (!isSupported(bridging.suggestedBridging)) {
		return {
			value: {
				id: 'chain_abstraction_no_suggested_bridging',
				displayName: 'Abstracts away most cross-chain complexity',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(
					'{{WALLET_NAME}} implements most cross-chain features, but does not automatically suggest cross-chain bridging.',
				),
			},
			details: markdown(`
				{{WALLET_NAME}} abstracts away most cross-chain complexity by
				implementing:

				- Global (cross-chain) account valuation.
				- Cross-chain token balances ("How many Ether do I have
					across all chains?"), while still allowing the user to go into
					per-chain balances if they wish.
				- Cross-chain bridging with transparent fee breakdown and risk
					explanation.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should automatically suggest to use its bridging
				feature when the user is attempting to spend funds on a chain where
				they have insufficient balance, while they have sufficient funds on
				another supported chain.
			`),
			references,
		}
	}

	// All pass.
	return {
		value: {
			id: 'chain_abstraction_pass',
			displayName: 'Abstracts away cross-chain complexity',
			rating: Rating.PASS,
			shortExplanation: sentence(
				'{{WALLET_NAME}} transparently implements cross-chain token balances and bridging.',
			),
		},
		details: markdown(`
			{{WALLET_NAME}} abstracts away cross-chain complexity by
			implementing:

			- Global (cross-chain) account valuation.
			- Cross-chain token balances ("How many Ether do I have
				across all chains?"), while still allowing the user to go into
				per-chain balances if they wish.
			- Cross-chain bridging with transparent fee breakdown and risk
				explanation.
			- Automatically suggesting cross-chain bridging when appropriate.
		`),
		references,
	}
}

const fullySupportedCrossChainBalanceDisplay: CrossChainBalanceDisplay = {
	crossChainSumView: featureSupported,
	perChainBalanceViewAcrossMultipleChains: featureSupported,
}

const fullySupportedCrossChainBalances: ChainAbstraction['crossChainBalances'] = {
	globalAccountValue: featureSupportedNoRef,
	perChainAccountValue: featureSupportedNoRef,
	ether: fullySupportedCrossChainBalanceDisplay,
	usdc: fullySupportedCrossChainBalanceDisplay,
	ref: refNotNecessary,
}

const fullySupportedBridging: ChainAbstraction['bridging'] = {
	builtInBridging: supported({
		ref: refNotNecessary,
		risksExplained: 'VISIBLE_BY_DEFAULT',
		feesLargerThan1bps: comprehensiveFeesShownByDefault,
	}),
	suggestedBridging: featureSupportedNoRef,
}

export const chainAbstraction: Attribute<ChainAbstractionValue> = {
	id: 'chainAbstraction',
	icon: '\u{1f309}', // Bridge
	displayName: 'Chain abstraction',
	wording: {
		midSentenceName: 'chain abstraction',
	},
	question: sentence(
		'Does the wallet smooth out the complexities of dealing with multiple chains?',
	),
	why: markdown(`
		Ethereum activity is not limited to the main L1 chain; a lot of activity
		has moved onto rollups and Layer 2 chains. This has allowed Ethereum to
		scale beyond what its L1 chain can handle, but has also introduced
		complexity and fragmentation for users and wallets to deal with.
		They must now deal with token balances fragmented across multiple chains.

		To address the UX impact of this complexity, wallets should provide
		features to abstract away these issues, while remaining transparent to
		the user when cross-chain bridging risks or fees are involved.
	`),
	methodology: markdown(`
		Wallets are rated based on how much of the complexity involved in dealing
		with multiple chains is abstracted away from users, while keeping risks
		and fees transparent.

		To get a passing rating, wallets must be cross-chain aware in how they
		display account value and individual token balances:

		- When displaying the user account's total value, this value should sum
			up the user's valuations across all chains the wallet supports by
			default.
		- When displaying a specific token's balance, the balance should reflect
			the user's total balance for this token across all wallet-supported
			chains (and on which the token exists). For rating purposes,
			Walletbeat looks specifically at Ether and USDT balances.

		In addition, wallets must make it easy for users to move their assets
		across chains when needed. To get a passing rating, wallets must provide
		a built-in bridging feature.

		- This bridging feature must explain the risks involved in bridging assets
			across chains. Our friends at [L2BEAT](https://l2beat.com/) do a
			fantastic job documenting this, but wallet developers also have a duty
			to explain these risks to their users.
		- For bridge operations where the net fee is larger than 1bps, the wallet
			must display the fee breakdown by default.
		- When the user attempts to send tokens to an address on a chain where the
			user's balance is insufficient, but for which they have sufficient tokens
			on another chain, the wallet should automatically propose to bridge them.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				sentence(
					'The wallet only displays account value or token balances for a single chain at a time.',
				),
				evaluateChainAbstraction({
					crossChainBalances: {
						ref: refNotNecessary,
						globalAccountValue: notSupported,
						perChainAccountValue: notSupported,
						ether: {
							crossChainSumView: notSupported,
							perChainBalanceViewAcrossMultipleChains: notSupported,
						},
						usdc: {
							crossChainSumView: notSupported,
							perChainBalanceViewAcrossMultipleChains: notSupported,
						},
					},
					bridging: fullySupportedBridging,
				}),
			),
			exampleRating(
				sentence('The wallet does not have a built-in cross-chain bridging feature.'),
				evaluateChainAbstraction({
					crossChainBalances: fullySupportedCrossChainBalances,
					bridging: {
						builtInBridging: notSupported,
						suggestedBridging: notSupported,
					},
				}),
			),
		],
		partial: [
			exampleRating(
				sentence(
					'The wallet displays global cross-chain account value, but not individual token balances across chains.',
				),
				evaluateChainAbstraction({
					crossChainBalances: {
						ref: refNotNecessary,
						globalAccountValue: featureSupported,
						perChainAccountValue: featureSupported,
						ether: {
							crossChainSumView: notSupported,
							perChainBalanceViewAcrossMultipleChains: featureSupported,
						},
						usdc: {
							crossChainSumView: notSupported,
							perChainBalanceViewAcrossMultipleChains: featureSupported,
						},
					},
					bridging: fullySupportedBridging,
				}),
			),
			exampleRating(
				sentence(
					'The wallet has a built-in cross-chain bridging feature, but bridging fees are not displayed by default.',
				),
				evaluateChainAbstraction({
					crossChainBalances: fullySupportedCrossChainBalances,
					bridging: {
						builtInBridging: supported({
							ref: refNotNecessary,
							feesLargerThan1bps: {
								byDefault: FeeDisplayLevel.NONE,
								afterSingleAction: FeeDisplayLevel.NONE,
								fullySponsored: false,
							},
							risksExplained: 'VISIBLE_BY_DEFAULT',
						}),
						suggestedBridging: notSupported,
					},
				}),
			),
			exampleRating(
				sentence(
					'The wallet has a built-in cross-chain bridging feature, but does not explain the risks involved in using it.',
				),
				evaluateChainAbstraction({
					crossChainBalances: fullySupportedCrossChainBalances,
					bridging: {
						builtInBridging: supported({
							ref: refNotNecessary,
							feesLargerThan1bps: comprehensiveFeesShownByDefault,
							risksExplained: 'HIDDEN_BY_DEFAULT',
						}),
						suggestedBridging: notSupported,
					},
				}),
			),
		],
		pass: exampleRating(
			sentence(
				'The wallet displays cross-chain balances of individual tokens. It automatically offers to bridge tokens between chains when necessary, explaining the risks and fees involved in doing so.',
			),
			evaluateChainAbstraction({
				crossChainBalances: fullySupportedCrossChainBalances,
				bridging: fullySupportedBridging,
			}),
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<ChainAbstractionValue> => {
		if (features.type !== WalletType.SOFTWARE) {
			return exempt(
				chainAbstraction,
				sentence('Only software wallets are expected to deal with chain abstraction.'),
				null,
			)
		}

		if (features.chainAbstraction === null) {
			return unrated(chainAbstraction, null)
		}

		return evaluateChainAbstraction(features.chainAbstraction)
	},
	aggregate: pickWorstRating<ChainAbstractionValue>,
}
