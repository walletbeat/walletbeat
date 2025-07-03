import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { AccountType, supportsOnlyAccountType } from '@/schema/features/account-support'
import type {
	CalldataDecodingTypes,
	DataExtractionMethods,
	DisplayedTransactionDetails,
} from '@/schema/features/security/hardware-wallet-dapp-signing'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
	displaysNoTransactionDetails,
	noCalldataDecoding,
	noDataExtraction,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
} from '@/schema/features/security/hardware-wallet-dapp-signing'
import { refs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.hardware_wallet_dapp_signing'

export type HardwareWalletDappSigningValue = Value & {
	messageExtraction: DataExtractionMethods | null
	messageDecoding: CalldataDecodingTypes | null
	calldataExtraction: DataExtractionMethods | null
	calldataDecoding: CalldataDecodingTypes | null
	displayedTransactionDetails: DisplayedTransactionDetails | null
	__brand: 'attributes.security.hardware_wallet_dapp_signing'
}

function noHardwareWalletSupport(): Evaluation<HardwareWalletDappSigningValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No dApp signing due to no hardware wallet support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not support hardware wallets, so dApp signing is not possible.',
			),
			messageExtraction: noDataExtraction,
			messageDecoding: noCalldataDecoding,
			calldataDecoding: noCalldataDecoding,
			calldataExtraction: noDataExtraction,
			displayedTransactionDetails: displaysNoTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} does not support connecting to any hardware wallets. Without hardware wallet support, dApp signing is not possible. dApp signing allows users to verify transaction details directly on the hardware wallet's screen before signing.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add support for hardware wallets to enable dApp signing, which enhances security by allowing users to verify transaction details on a separate device.',
		),
	}
}

function noDappSigning(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
): Evaluation<HardwareWalletDappSigningValue> {
	return {
		value: {
			id: 'no_dapp_signing',
			rating: Rating.FAIL,
			displayName: 'No dApp signing support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports hardware wallets but without effective dApp signing.',
			),
			messageExtraction,
			messageDecoding,
			calldataDecoding,
			calldataExtraction,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports hardware wallets but does not implement effective dApp signing. dApp signing is important for security as it allows users to verify transaction details on their hardware wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement comprehensive dApp signing support for hardware wallets to improve security by allowing users to verify transaction details on their hardware device.',
		),
	}
}

function basicDappSigning(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
	supportedWallets: string[] = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'basic_dapp_signing',
			rating: Rating.PARTIAL,
			displayName: 'Basic dApp signing support',
			shortExplanation: sentence(
				`{{WALLET_NAME}} supports hardware wallets with basic dApp signing${supportedWalletsText}.`,
			),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} supports hardware wallets with basic dApp signing${supportedWalletsText}, but the implementation does not provide full transparency for all transaction details. dApp signing allows users to verify transaction details on their hardware wallet screen before signing, which is crucial for security.`,
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should improve its dApp signing implementation to provide full transparency for all transaction details and better calldata extraction methods.',
		),
	}
}

function partialDappSigning(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
	supportedWallets: string[] = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'partial_dapp_signing',
			rating: Rating.PARTIAL,
			displayName: 'Partial dApp signing support',
			shortExplanation: sentence(
				`{{WALLET_NAME}} supports hardware wallets with partial dApp signing${supportedWalletsText}.`,
			),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} supports hardware wallets with partial dApp signing${supportedWalletsText}. Most transaction details are displayed on the hardware wallet screen for verification, but some complex transactions may not show all details. dApp signing is crucial for security as it allows users to verify transaction details before signing.`,
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should extend its dApp signing implementation to cover all transaction types and ensure all details are clearly displayed with better extraction methods.',
		),
	}
}

function fullDappSigning(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
	supportedWallets: string[] = [],
	refs: Array<{ url: string; explanation: string }> = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'full_dapp_signing',
			rating: Rating.PASS,
			displayName: 'Full dApp signing support',
			shortExplanation: sentence(
				`{{WALLET_NAME}} supports hardware wallets with full dApp signing${supportedWalletsText}.`,
			),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			`{{WALLET_NAME}} supports hardware wallets with full dApp signing implementation${supportedWalletsText}. All transaction details are clearly displayed on the hardware wallet screen for verification before signing, providing maximum security and transparency for users.`,
		),
		// Include references if provided
		references: refs.length > 0 ? refs : undefined,
	}
}

/**
 * Helper function for `DataExtractionMethods` that only supports one method.
 */
function singleDataExtractionMethod(method: DataExtraction): DataExtractionMethods {
	return {
		[DataExtraction.EYES]: method === DataExtraction.EYES,
		[DataExtraction.QRCODE]: method === DataExtraction.QRCODE,
		[DataExtraction.HASHES]: method === DataExtraction.HASHES,
	}
}

/**
 * Helper function for `DataExtractionMethods` that only supports one method.
 */
function singleCalldataDecodingType(calldataDecoding: CalldataDecoding): CalldataDecodingTypes {
	return {
		[CalldataDecoding.AAVE_SUPPLY]: calldataDecoding === CalldataDecoding.AAVE_SUPPLY,
		[CalldataDecoding.ETH_USDC_TRANSFER]: calldataDecoding === CalldataDecoding.ETH_USDC_TRANSFER,
		[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]:
			calldataDecoding === CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED,
		[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
			calldataDecoding ===
			CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
		[CalldataDecoding.ZKSYNC_USDC_TRANSFER]:
			calldataDecoding === CalldataDecoding.ZKSYNC_USDC_TRANSFER,
	}
}

export const hardwareWalletDappSigning: Attribute<HardwareWalletDappSigningValue> = {
	id: 'hardwareWalletDappSigning',
	icon: '\u{1F50F}', // Lock with pen
	displayName: 'Hardware Wallet dApp Signing',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware wallet dApp signing support evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve hardware wallet dApp signing support?',
		),
	},
	question: sentence('Does the wallet support secure dApp signing with hardware wallets?'),
	why: markdown(`
		dApp Signing is a critical security feature for hardware wallets that allows users to verify
		transaction details directly on their hardware wallet's screen before signing. This verification
		step is crucial for preventing attacks where malicious software might attempt to trick users
		into signing transactions with different parameters than what they intended.
		
		Without dApp signing, users must trust that the software wallet is displaying the correct
		transaction details and not manipulating them. With dApp signing, the hardware wallet shows
		the actual transaction details that will be signed, providing an independent verification
		mechanism that significantly enhances security.
		
		Full dApp signing implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the hardware wallet screen, EIP-712 message hashes,
		and decoded calldata, allowing users to make informed decisions before authorizing transactions.
	`),
	methodology: markdown(`
		Hardware wallets are evaluated based on their implementation of dApp signing capabilities.
		
		A hardware wallet receives a passing rating if it implements full dApp signing, where all transaction
		details are clearly displayed on the hardware wallet screen for verification before signing. This includes
		support for standard transactions, ERC-20 token transfers, 712 messages and complex contract interactions. 

		The hardware should be able to **display clearly all transaction types on Safe, Aave and Uniswap.**
		To do so **the hardware MUST be able to connect directly to the dapp or allow the user to use at least two different software wallets independent from the hardware manufacturer**.
		
		A hardware wallet receives a partial rating if it implements dApp signing but with limitations, such
		as not displaying all transaction details or not supporting dApp signing for all transaction types. Or if the hardware supports only one independent software wallet. Or if the hardware supports only 1/3 of the dapps.
		
		A hardware wallet fails this attribute if it doesn't properly implement dApp signing functionality,
		requiring users to trust the connected software wallet without independent verification.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full dApp signing with hardware wallets, displaying all
				transaction details on the hardware wallet screen for verification before signing.
			`),
			fullDappSigning(
				singleDataExtractionMethod(DataExtraction.QRCODE),
				singleCalldataDecodingType(
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
				),
				singleDataExtractionMethod(DataExtraction.QRCODE),
				singleCalldataDecodingType(
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
				),
				displaysFullTransactionDetails,
			).value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet implements partial dApp signing, where most but not all transaction
					details are displayed on the hardware wallet screen.
				`),
				partialDappSigning(
					singleDataExtractionMethod(DataExtraction.EYES),
					singleCalldataDecodingType(CalldataDecoding.ETH_USDC_TRANSFER),
					singleDataExtractionMethod(DataExtraction.EYES),
					singleCalldataDecodingType(CalldataDecoding.ETH_USDC_TRANSFER),
					{
						...displaysNoTransactionDetails,
						gas: true,
						nonce: true,
					},
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet implements basic dApp signing, but the implementation is limited
					and doesn't provide full transparency for all transaction details.
				`),
				basicDappSigning(
					singleDataExtractionMethod(DataExtraction.EYES),
					noCalldataDecoding,
					singleDataExtractionMethod(DataExtraction.EYES),
					noCalldataDecoding,
					{
						...displaysNoTransactionDetails,
						gas: true,
						nonce: true,
					},
				).value,
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet supports hardware wallets but does not implement effective dApp signing.
				`),
				noDappSigning(
					noDataExtraction,
					noCalldataDecoding,
					noDataExtraction,
					noCalldataDecoding,
					displaysNoTransactionDetails,
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet does not support hardware wallets at all.
				`),
				noHardwareWalletSupport().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletDappSigningValue> => {
		// For hardware wallets themselves:
		// This evaluates the hardware wallet's own dApp signing capabilities
		if (features.type === WalletType.HARDWARE) {
			// Check if dApp signing feature exists
			if (features.security.hardwareWalletDappSigning === null) {
				return unrated(hardwareWalletDappSigning, brand, {
					messageExtraction: null,
					messageDecoding: null,
					calldataDecoding: null,
					calldataExtraction: null,
					displayedTransactionDetails: null,
				})
			}

			// Extract references from the hardware wallet dApp signing feature
			const references = refs(features.security.hardwareWalletDappSigning)

			const messageExtraction =
				features.security.hardwareWalletDappSigning.messageSigning.messageExtraction
			const messageDecoding =
				features.security.hardwareWalletDappSigning.messageSigning.calldataDecoding
			const calldataExtraction =
				features.security.hardwareWalletDappSigning.transactionSigning.calldataExtraction
			const calldataDecoding =
				features.security.hardwareWalletDappSigning.transactionSigning.calldataDecoding
			const displayedTransactionDetails =
				features.security.hardwareWalletDappSigning.transactionSigning.displayedTransactionDetails

			// Determine overall rating based on all features
			const getOverallRating = (): Rating => {
				// If any feature is null (unreviewed), return UNRATED
				if (
					messageExtraction === null ||
					messageDecoding === null ||
					calldataDecoding === null ||
					calldataExtraction === null ||
					displayedTransactionDetails === null
				) {
					return Rating.UNRATED
				}

				// PASS: Full support across all dimensions
				const messageExtractionPass: boolean =
					messageExtraction[DataExtraction.QRCODE] || messageExtraction[DataExtraction.HASHES]
				// NOTE: In the future, having multi-send decoded will be required
				const messageDecodingPass: boolean =
					messageDecoding[
						CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
					] || messageDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]
				const calldataExtractionPass: boolean =
					calldataExtraction[DataExtraction.QRCODE] || calldataExtraction[DataExtraction.HASHES]
				const calldataDecodingPass: boolean =
					calldataDecoding[
						CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
					] || calldataDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]
				const displayedTransactionDetailsPass: boolean =
					displayedTransactionDetails === displaysFullTransactionDetails

				if (
					messageExtractionPass &&
					messageDecodingPass &&
					calldataExtractionPass &&
					calldataDecodingPass &&
					displayedTransactionDetailsPass
				) {
					return Rating.PASS
				}

				// FAIL: No support or very poor support
				// At this time, we do not consider not decoding to be a fail
				const messageExtractionFail: boolean = !supportsAnyDataExtraction(messageExtraction)
				const calldataExtractionFail: boolean = !supportsAnyDataExtraction(calldataExtraction)
				const displayedTransactionDetailsFail: boolean =
					displayedTransactionDetails !== displaysFullTransactionDetails

				if ((messageExtractionFail || calldataExtractionFail) && displayedTransactionDetailsFail) {
					return Rating.FAIL
				}

				// PARTIAL: Everything else
				return Rating.PARTIAL
			}

			const overallRating = getOverallRating()

			const result = ((): Evaluation<HardwareWalletDappSigningValue> => {
				if (overallRating === Rating.UNRATED) {
					return unrated(hardwareWalletDappSigning, brand, {
						messageExtraction,
						messageDecoding,
						calldataExtraction,
						calldataDecoding,
						displayedTransactionDetails,
					})
				}

				// Necessary check to appease the TypeScript typechecker, as it can't
				// guarantee that the `null` checks we've already performed are still
				// true when executing this inner function. This should never happen.
				if (
					messageExtraction === null ||
					messageDecoding === null ||
					calldataDecoding === null ||
					calldataExtraction === null ||
					displayedTransactionDetails === null
				) {
					throw new Error(
						'Got unknown message extraction or calldata decoding information despite checking it earlier',
					)
				}

				if (overallRating === Rating.FAIL) {
					return noDappSigning(
						messageExtraction,
						messageDecoding,
						calldataExtraction,
						calldataDecoding,
						displayedTransactionDetails,
					)
				} else if (overallRating === Rating.PASS) {
					return fullDappSigning(
						messageExtraction,
						messageDecoding,
						calldataExtraction,
						calldataDecoding,
						displayedTransactionDetails,
						['this hardware wallet'],
					)
				} else {
					// Determine if it's basic or partial based on some features working
					const hasPartialSupport =
						!supportsAnyCalldataDecoding(messageDecoding) ||
						!supportsAnyCalldataDecoding(calldataDecoding)

					if (hasPartialSupport) {
						return partialDappSigning(
							messageExtraction,
							messageDecoding,
							calldataExtraction,
							calldataDecoding,
							displayedTransactionDetails,
							['this hardware wallet'],
						)
					} else {
						return basicDappSigning(
							messageExtraction,
							messageDecoding,
							calldataExtraction,
							calldataDecoding,
							displayedTransactionDetails,
							['this hardware wallet'],
						)
					}
				}
			})()

			// Return result with references
			return {
				...result,
				references,
			}
		}

		// Check for ERC-4337 smart wallet
		if (supportsOnlyAccountType(features.accountSupport, AccountType.rawErc4337)) {
			return exempt(
				hardwareWalletDappSigning,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is an ERC-4337 smart contract wallet.',
				),
				brand,
				{
					messageExtraction: null,
					messageDecoding: null,
					calldataExtraction: null,
					calldataDecoding: null,
					displayedTransactionDetails: null,
				},
			)
		}

		// For software wallets:
		// Make this attribute exempt as it should only apply to hardware wallets
		return {
			value: {
				id: 'exempt_software_wallet',
				rating: Rating.EXEMPT,
				displayName: 'Only applicable for hardware wallets',
				shortExplanation: sentence(
					'This attribute evaluates hardware wallet dApp signing capabilities and is not applicable for software wallets.',
				),
				messageExtraction: null,
				messageDecoding: null,
				calldataExtraction: null,
				calldataDecoding: null,
				displayedTransactionDetails: null,
				__brand: brand,
			},
			details: paragraph(
				'As {{WALLET_NAME}} is a software wallet, this attribute which evaluates hardware wallet dApp signing capabilities is not applicable. Please see the hardware wallet integration attribute for how well this software wallet connects to hardware wallets.',
			),
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwareWalletDappSigningValue>>) =>
		pickWorstRating<HardwareWalletDappSigningValue>(perVariant),
}
