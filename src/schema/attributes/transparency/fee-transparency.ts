import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { isSupported, notSupported, type Support, supported } from '@/schema/features/support'
import { type FeeDisplay, FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { type FullyQualifiedReference, mergeRefs, refs, type WithRef } from '@/schema/reference'
import type { AtLeastOneVariant } from '@/schema/variants'
import { markdown, paragraph, sentence } from '@/types/content'
import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import { markdownListFormat } from '@/types/utils/text'

import { pickWorstRating, unrated } from '../common'

/**
 * All possible fee types that a wallet may charge.
 */
export enum FeeType {
	ETH_L1_TRANSFER = 'ETH_L1_TRANSFER',
	ERC20_L1_TRANSFER = 'ERC20_L1_TRANSFER',
	BUILT_IN_ERC20_SWAP = 'BUILT_IN_ERC20_SWAP',
	UNISWAP_USDC_TO_ETHER_SWAP = 'UNISWAP_USDC_TO_ETHER_SWAP',
	CROSS_CHAIN_BRIDGING = 'CROSS_CHAIN_BRIDGING',
	TORNADO_CASH_NOVA_RELAYER = 'TORNADO_CASH_NOVA_RELAYER',
	STEALTH_ADDRESS_SENDING = 'STEALTH_ADDRESS_SENDING',
}

/** Set of all fee types. */
export const allFeeTypes: FeeType[] = [
	FeeType.ETH_L1_TRANSFER,
	FeeType.ERC20_L1_TRANSFER,
	FeeType.BUILT_IN_ERC20_SWAP,
	FeeType.UNISWAP_USDC_TO_ETHER_SWAP,
	FeeType.CROSS_CHAIN_BRIDGING,
	FeeType.TORNADO_CASH_NOVA_RELAYER,
	FeeType.STEALTH_ADDRESS_SENDING,
]

/**
 * Record of fee type to its support status and info within a wallet.
 */
export type FeeTransparency = Record<FeeType, Support<WithRef<FeeDisplay>> | null>

/**
 * Human-readable description for a given fee type.
 */
function feeTypeDescription(feeType: FeeType): string {
	switch (feeType) {
		case FeeType.ETH_L1_TRANSFER:
			return 'Ether transfers on L1'
		case FeeType.ERC20_L1_TRANSFER:
			return 'ERC-20 transfers on L1'
		case FeeType.BUILT_IN_ERC20_SWAP:
			return 'built-in ERC-20 swaps'
		case FeeType.UNISWAP_USDC_TO_ETHER_SWAP:
			return 'USDC to Ether swap on Uniswap'
		case FeeType.CROSS_CHAIN_BRIDGING:
			return 'cross-chain bridging transactions'
		case FeeType.TORNADO_CASH_NOVA_RELAYER:
			return 'Tornado Cash Nova transactions'
		case FeeType.STEALTH_ADDRESS_SENDING:
			return 'sending funds to stealth addresses'
	}
}

/**
 * Return the fee display level for the given fee type.
 */
function feeDisplayLevelForType(
	features: ResolvedFeatures,
	feeType: FeeType,
): Support<WithRef<FeeDisplay>> | null {
	switch (feeType) {
		case FeeType.ETH_L1_TRANSFER:
			if (features.transparency.operationFees === null) {
				return null
			}

			return features.transparency.operationFees.ethL1Transfer
		case FeeType.ERC20_L1_TRANSFER:
			if (features.transparency.operationFees === null) {
				return null
			}

			return features.transparency.operationFees.erc20L1Transfer
		case FeeType.BUILT_IN_ERC20_SWAP:
			if (features.transparency.operationFees === null) {
				return null
			}

			return features.transparency.operationFees.builtInErc20Swap
		case FeeType.UNISWAP_USDC_TO_ETHER_SWAP:
			if (features.transparency.operationFees === null) {
				return null
			}

			return features.transparency.operationFees.uniswapUSDCToEtherSwap
		case FeeType.CROSS_CHAIN_BRIDGING:
			if (features.chainAbstraction === null) {
				return null
			}

			if (!isSupported(features.chainAbstraction.bridging.builtInBridging)) {
				return notSupported
			}

			return supported({
				...features.chainAbstraction.bridging.builtInBridging.feesLargerThan1bps,
				ref: features.chainAbstraction.bridging.builtInBridging.ref,
			})
		case FeeType.STEALTH_ADDRESS_SENDING:
			return (() => {
				if (features.privacy.transactionPrivacy === null) {
					return null
				}

				const stealthAddr =
					features.privacy.transactionPrivacy[PrivateTransferTechnology.STEALTH_ADDRESSES]

				if (!isSupported(stealthAddr)) {
					return notSupported
				}

				return supported({ ...stealthAddr.fees, ref: stealthAddr.ref })
			})()
		case FeeType.TORNADO_CASH_NOVA_RELAYER:
			return (() => {
				if (features.privacy.transactionPrivacy === null) {
					return null
				}

				const tornadoCashNova =
					features.privacy.transactionPrivacy[PrivateTransferTechnology.TORNADO_CASH_NOVA]

				if (!isSupported(tornadoCashNova)) {
					return notSupported
				}

				return supported({ ...tornadoCashNova.relayerFee, ref: tornadoCashNova.ref })
			})()
	}
}

function extractFeeTransparency(features: ResolvedFeatures): FeeTransparency {
	return Object.fromEntries(
		allFeeTypes.map(feeType => [feeType, feeDisplayLevelForType(features, feeType)]),
	)
}

function validateFeeDisplay(feeDisplay: FeeDisplay) {
	if (
		(feeDisplay.byDefault === FeeDisplayLevel.AGGREGATED ||
			feeDisplay.byDefault === FeeDisplayLevel.COMPREHENSIVE) &&
		feeDisplay.afterSingleAction === FeeDisplayLevel.NONE
	) {
		throw new Error(
			'Invalid fee display: Cannot have afterSingleAction=NONE if the default behavior is not NONE',
		)
	}

	if (
		feeDisplay.byDefault === FeeDisplayLevel.COMPREHENSIVE &&
		feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE
	) {
		throw new Error(
			'Invalid fee display: Cannot have byDefault=COMPREHENSIVE if the afterSingleAction behavior is not also comprehensive',
		)
	}
}

/**
 * Returns;
 *   * 1 if feeDisplay1 is better
 *   * 0 if feeDisplay1 and feeDisplay2 are completely equal
 *   * -1 if feeDisplay2 is better
 */
function compareFeeDisplay(feeDisplay1: FeeDisplay, feeDisplay2: FeeDisplay): -1 | 0 | 1 {
	validateFeeDisplay(feeDisplay1)
	validateFeeDisplay(feeDisplay2)

	if (
		feeDisplay1.byDefault === feeDisplay2.byDefault &&
		feeDisplay1.afterSingleAction === feeDisplay2.afterSingleAction &&
		feeDisplay1.fullySponsored === feeDisplay2.fullySponsored
	) {
		return 0
	}

	if (feeDisplay1.fullySponsored !== feeDisplay2.fullySponsored) {
		return feeDisplay1.fullySponsored ? 1 : -1
	}

	const compareFeeDisplayLevel = (
		displayLevel1: FeeDisplayLevel,
		displayLevel2: FeeDisplayLevel,
	): -1 | 0 | 1 => {
		if (displayLevel1 === FeeDisplayLevel.COMPREHENSIVE) {
			return 1
		}

		if (displayLevel2 === FeeDisplayLevel.COMPREHENSIVE) {
			return -1
		}

		if (displayLevel1 === FeeDisplayLevel.AGGREGATED) {
			return 1
		}

		if (displayLevel2 === FeeDisplayLevel.AGGREGATED) {
			return -1
		}

		throw new Error('Unreachable')
	}

	if (feeDisplay1.byDefault !== feeDisplay2.byDefault) {
		return compareFeeDisplayLevel(feeDisplay1.byDefault, feeDisplay2.byDefault)
	}

	if (feeDisplay1.afterSingleAction !== feeDisplay2.afterSingleAction) {
		return compareFeeDisplayLevel(feeDisplay1.afterSingleAction, feeDisplay2.afterSingleAction)
	}

	throw new Error('Unreachable')
}

/**
 * How a wallet handles the worst type of fees it does handle.
 */
type WorstFeeDisplay = {
	/** The way the wallet displays fees. */
	feeDisplay: FeeDisplay

	/** The fee types for which the wallet uses this method of displaying fees. */
	feeTypes: NonEmptyArray<FeeType>

	/** Whether the wallet uses this fee display method for all fee types it supports. */
	isUniform: boolean

	/** References for the relevant fee types only. */
	references: FullyQualifiedReference[]
}

/**
 * Get the worst fee display that the wallet supports, along with
 * the fee types for which this display is used.
 * Returns null if all fee types are either null or unsupported,
 * but not in the case where some fee types are supported.
 */
function computeWorstFees(feeTransparency: FeeTransparency): WorstFeeDisplay | null {
	let worstFeeTypes: WorstFeeDisplay | null = null

	for (const feeType of allFeeTypes) {
		const feeDisplay = feeTransparency[feeType]

		if (feeDisplay === null || !isSupported(feeDisplay)) {
			continue
		}

		if (worstFeeTypes === null) {
			worstFeeTypes = {
				feeTypes: [feeType],
				feeDisplay,
				isUniform: true,
				references: refs(feeDisplay),
			}
			continue
		}

		switch (compareFeeDisplay(worstFeeTypes.feeDisplay, feeDisplay)) {
			case -1:
				worstFeeTypes.isUniform = false
				break
			case 0:
				worstFeeTypes.feeTypes.push(feeType)
				worstFeeTypes.references = mergeRefs(worstFeeTypes.references, refs(feeDisplay))
				break
			case 1:
				worstFeeTypes = {
					feeTypes: [feeType],
					feeDisplay,
					isUniform: false,
					references: refs(feeDisplay),
				}
		}
	}

	return worstFeeTypes
}

export type FeeTransparencyValue = Value & {
	worstFeeDisplay: WorstFeeDisplay | null
}

function evaluateWorstFeeDisplay(
	worstFeeDisplay: WorstFeeDisplay,
): Evaluation<FeeTransparencyValue> {
	const references = worstFeeDisplay.references
	const baseValue = {
		worstFeeDisplay,
	} as const
	const worstFeeTypesMarkdown = (indent: string): string =>
		markdownListFormat(nonEmptyMap(worstFeeDisplay.feeTypes, feeTypeDescription), {
			singleItemTemplate: 'ITEM.',
			multiItemPrefix: 'the following transaction types:' + indent,
			multiItemTemplate: indent + '* ITEM',
			multiItemSuffix: indent,
			uppercaseFirstCharacterOfListItems: true,
			ifEmpty: { behavior: 'THROW_ERROR' },
		})

	if (worstFeeDisplay.feeDisplay.fullySponsored) {
		if (!worstFeeDisplay.isUniform) {
			throw new Error('Logic error: all fees should be uniformly handled if fully sponsored')
		}

		return {
			value: {
				id: 'fully_sponsored_fees',
				displayName: 'Fully sponsored fees',
				rating: Rating.PASS,
				shortExplanation: sentence(`
					{{WALLET_NAME}} sponsors all fees.
				`),
				...baseValue,
			},
			details: markdown(`
				{{WALLET_NAME}} sponsors all fees. This means users do not need to
				worry about what fees they are being charged.
			`),
			references,
		}
	}

	if (worstFeeDisplay.feeDisplay.byDefault === FeeDisplayLevel.NONE) {
		if (worstFeeDisplay.isUniform) {
			return {
				value: {
					id: 'hidden_fees',
					displayName: 'Hidden fees',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} hides transaction fees.
					`),
					...baseValue,
				},
				details: markdown(`
					{{WALLET_NAME}} hides the fees being charged to the user.
					They are not displayed to the user by default.
				`),
				howToImprove: markdown(`
					{{WALLET_NAME}} should display all fees charged to the user.
				`),
				impact: markdown(`
					Obfuscating or hiding fees being charged to users means users
					do not know where their money is going.
				`),
				references,
			}
		}

		return {
			value: {
				id: 'some_hidden_fees',
				displayName: 'Some hidden fees',
				rating: Rating.FAIL,
				shortExplanation: sentence(`
						{{WALLET_NAME}} hides some transaction fees.
					`),
				...baseValue,
			},
			details: markdown(`
				{{WALLET_NAME}} hides the some of fees being charged to the user.
				They are not displayed to the user by default for ${worstFeeTypesMarkdown(`
				`)}
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should display all fees charged to the user.
			`),
			impact: markdown(`
				Obfuscating or hiding fees being charged to users means users
				do not know where their money is going.
			`),
			references,
		}
	}

	if (worstFeeDisplay.feeDisplay.afterSingleAction === FeeDisplayLevel.AGGREGATED) {
		if (worstFeeDisplay.isUniform) {
			return {
				value: {
					id: 'non_comprehensive_fees',
					displayName: 'Non-comprehensive fees',
					rating: Rating.PARTIAL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} does not break down transaction fees.
					`),
					...baseValue,
				},
				details: markdown(`
					{{WALLET_NAME}} does not show the user a complete breakdown of the
					fees charged to the user.
				`),
				howToImprove: markdown(`
					{{WALLET_NAME}} should display a complete fee breakdown in the
					transaction flow.
				`),
				impact: markdown(`
					Users see how much they are paying in fees, but are not able to
					determine where this money is going exactly.
				`),
				references,
			}
		}

		return {
			value: {
				id: 'some_non_comprehensive_fees',
				displayName: 'Some non-comprehensive fees',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not break down some transaction fees.
				`),
				...baseValue,
			},
			details: markdown(`
				{{WALLET_NAME}} does not show the user a complete breakdown of the
				fees charged to the user for ${worstFeeTypesMarkdown(`
				`)}
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should display a complete fee breakdown in the
				transaction flow for all transaction types.
			`),
			impact: markdown(`
				Users see how much they are paying in fees, but are not able to
				determine where this money is going exactly.
			`),
			references,
		}
	}

	if (worstFeeDisplay.feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE) {
		throw new Error('Logic error')
	}

	return {
		value: {
			id: 'comprehensive_fees',
			displayName: 'Comprehensive fee breakdown',
			rating: Rating.PASS,
			shortExplanation: sentence(`
				{{WALLET_NAME}} breaks down all transaction fees.
			`),
			...baseValue,
		},
		details: markdown(`
			{{WALLET_NAME}} shows a complete breakdown of all transaction
			fees${worstFeeDisplay.feeDisplay.byDefault === FeeDisplayLevel.COMPREHENSIVE ? ' by default' : ''}.
		`),
		references,
	}
}

export const feeTransparency: Attribute<FeeTransparencyValue> = {
	id: 'feeTransparency',
	icon: '\u{1F4B8}', // Money with wings
	displayName: 'Fee transparency',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's fee transparency evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve fee transparency?'),
	},
	question: sentence('Does the wallet clearly display all transaction fees and their purpose?'),
	why: markdown(`
		Fee transparency is crucial for users to understand the full cost of their transactions.
		Without clear fee information, users may be surprised by high transaction costs or
		hidden fees charged by the wallet.
		
		Transparent fee disclosure helps users make informed decisions about when to transact
		and which wallet to use. It also builds trust between users and wallet providers by
		ensuring that all costs are clearly communicated upfront.
	`),
	methodology: markdown(`
		Wallets are evaluated based on how transparently they display transaction fees and
		transaction purposes to users.

		A wallet receives a passing rating if it provides comprehensive fee information,
		including detailed breakdowns of network fees, clear disclosure of any additional
		wallet fees. Fees may be aggregated down to one number, but a breakdown must be
		available to the user within a single click.

		A wallet receives a partial rating if it provides an aggregate fee but does not
		let the user get a detailed breakdown.

		A wallet fails this attribute if it provides minimal or no fee information before
		transaction confirmation.

		Various transaction types are tested: Ether and ERC-20 transfers on L1, built-in
		swaps or bridging transactions, DeFi transactions, private transactions if
		supported. If a wallet displays fees differently depending on the type of
		transaction, the transaction type with the **least clear** display level is
		taken into consideration for the purpose of this attribute.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: true,
		fail: exampleRating(
			paragraph('The wallet hides all or some of the transaction fees charged to the user.'),
			evaluateWorstFeeDisplay({
				feeDisplay: {
					byDefault: FeeDisplayLevel.NONE,
					afterSingleAction: FeeDisplayLevel.NONE,
					fullySponsored: false,
				},
				feeTypes: [FeeType.ETH_L1_TRANSFER],
				isUniform: true,
				references: [],
			}),
		),
		partial: exampleRating(
			paragraph(
				'The wallet shows an aggregate transaction fee by default, but does not provide a full breakdown.',
			),
			evaluateWorstFeeDisplay({
				feeDisplay: {
					byDefault: FeeDisplayLevel.AGGREGATED,
					afterSingleAction: FeeDisplayLevel.AGGREGATED,
					fullySponsored: false,
				},
				feeTypes: [FeeType.ETH_L1_TRANSFER],
				isUniform: true,
				references: [],
			}),
		),
		pass: [
			exampleRating(
				paragraph(
					'The wallet displays the full transaction fee breakdown by default for all transaction types it supports.',
				),
				evaluateWorstFeeDisplay({
					feeDisplay: {
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
					},
					feeTypes: [FeeType.ETH_L1_TRANSFER],
					isUniform: true,
					references: [],
				}),
			),
			exampleRating(
				paragraph(
					'The wallet displays an aggregate transaction fee for all transaction types it supports, and the user can get a full breakdown in just one click.',
				),
				evaluateWorstFeeDisplay({
					feeDisplay: {
						byDefault: FeeDisplayLevel.AGGREGATED,
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
					},
					feeTypes: [FeeType.ETH_L1_TRANSFER],
					isUniform: true,
					references: [],
				}),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<FeeTransparencyValue> => {
		const feeTransparencyData: FeeTransparency = extractFeeTransparency(features)
		const worstFeeDisplay = computeWorstFees(feeTransparencyData)

		if (worstFeeDisplay === null) {
			return unrated(feeTransparency, { worstFeeDisplay: null })
		}

		return evaluateWorstFeeDisplay(worstFeeDisplay)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<FeeTransparencyValue>>) =>
		pickWorstRating<FeeTransparencyValue>(perVariant),
}
