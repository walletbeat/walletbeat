import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import type {
	CalldataDecodingTypes,
	DataExtractionMethods,
	DisplayedTransactionDetails,
} from '@/schema/features/security/signing-intent-clarity'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
	displaysNoTransactionDetails,
	isFullTransactionDetails,
	noCalldataDecoding,
	noDataExtraction,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
} from '@/schema/features/security/signing-intent-clarity'
import { refs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.signing_intent_clarity'

export type SigningIntentClarityValue = Value & {
	messageExtraction: DataExtractionMethods | null
	messageDecoding: CalldataDecodingTypes | null
	calldataExtraction: DataExtractionMethods | null
	calldataDecoding: CalldataDecodingTypes | null
	displayedTransactionDetails: DisplayedTransactionDetails | null
	__brand: 'attributes.security.signing_intent_clarity'
}

function noSigningIntentClarity(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
): Evaluation<SigningIntentClarityValue> {
	return {
		value: {
			id: 'no_signing_intent_clarity',
			rating: Rating.FAIL,
			displayName: 'No signing intent clarity support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports does not have effective signing intent clarity.',
			),
			messageExtraction,
			messageDecoding,
			calldataDecoding,
			calldataExtraction,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} implements either zero or very little signing intent clarity. Signature intent clarity is important for security as it allows users to verify transaction details on their wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement comprehensive signing intent clarity to improve security by allowing users to verify transaction details on their device.',
		),
	}
}

function basicSigningIntentClarity(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
): Evaluation<SigningIntentClarityValue> {
	return {
		value: {
			id: 'basic_signing_intent_clarity',
			rating: Rating.PARTIAL,
			displayName: 'Basic signing intent clarity support',
			shortExplanation: sentence('{{WALLET_NAME}} supports basic signing intent clarity.'),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports basic signing intent clarity, but the implementation does not provide full transparency for all transaction details. Signature intent clarity is important for security as it allows users to verify transaction details on their wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should improve its signing intent clarity implementation to provide full transparency for all transaction details and better calldata extraction methods.',
		),
	}
}

function partialSigningIntentClarity(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
): Evaluation<SigningIntentClarityValue> {
	return {
		value: {
			id: 'partial_signing_intent_clarity',
			rating: Rating.PARTIAL,
			displayName: 'Partial signing intent clarity support',
			shortExplanation: sentence('{{WALLET_NAME}} supports partial signing intent clarity.'),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports partial signing intent clarity. Most transaction details are displayed on the wallet screen/window for verification, but some complex transactions may not show all details. Showing transaction details (signing intent clarity) is crucial for security as it allows users to verify transaction details before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should extend its signing intent clarity implementation to cover all transaction types and ensure all details are clearly displayed with better extraction methods.',
		),
	}
}

function fullSigningIntentClarity(
	messageExtraction: DataExtractionMethods | null,
	messageDecoding: CalldataDecodingTypes | null,
	calldataExtraction: DataExtractionMethods | null,
	calldataDecoding: CalldataDecodingTypes | null,
	displayedTransactionDetails: DisplayedTransactionDetails | null,
	refs: Array<{ url: string; explanation: string }> = [],
): Evaluation<SigningIntentClarityValue> {
	return {
		value: {
			id: 'full_signing_intent_clarity',
			rating: Rating.PASS,
			displayName: 'Full signing intent clarity support',
			shortExplanation: sentence('{{WALLET_NAME}} supports full signing intent clarity.'),
			messageExtraction,
			messageDecoding,
			calldataExtraction,
			calldataDecoding,
			displayedTransactionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} full signing intent clarity. All transaction details are clearly displayed on the wallet screen/window for verification before signing, providing maximum security and transparency for users.',
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
		[DataExtraction.COPY]: method === DataExtraction.COPY,
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

export const signingIntentClarity: Attribute<SigningIntentClarityValue> = {
	id: 'signingIntentClarity',
	icon: '\u{1F50F}', // Lock with pen
	displayName: 'Signing Intent Clarity',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's signing intent clarity support evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve signing intent clarity support?',
		),
	},
	question: sentence(
		'When asking the user to sign a transaction, does the wallet give enough information for the user to verify the what the signature is for?',
	),
	why: markdown(`
		Signing intent clarity is a critical security feature for wallets that allows users to verify
		transaction details directly on their wallet's screen/window before signing. This verification
		step is crucial for preventing attacks where malicious software might attempt to trick users
		into signing transactions with different parameters than what they intended.
		
		Without this, users are at the mercy of the dApp they are interacting with sending them a bad transactions, either because they have a bug, were hacked, or are malicious. Without a signer being able to verify if their transaction is correct, user should not send such a transaction.
		
		Full signing intent clarity implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the wallet screen, EIP-712 message hashes,
		and decoded calldata, allowing users to make informed decisions before authorizing transactions.
	`),
	methodology: markdown(`
		Wallets are evaluated based on their implementation of signing intent clarity capabilities.
		
		A wallet receives a passing rating if it implements full signing intent clarity, where all transaction
		details are clearly displayed on the wallet screen for verification before signing. This includes
		support for standard transactions, ERC-20 token transfers, EIP-712 messages and complex contract interactions. 

		The should be able to **display clearly all transaction types on Safe, Aave and Uniswap.**
		To do so, if the wallet is a hardware wallet, **the wallet MUST be able to connect directly to the dapp**.
		
		A wallet receives a partial rating if it implements signing intent clarity but with limitations, such
		as not displaying all transaction details or not supporting signing intent clarity for all transaction types.
		
		A hardware wallet fails this attribute if it doesn't properly implement signing intent clarity functionality,
		requiring users to trust the connected software wallet without independent verification.

		For hardware wallets, the signature/transaction information *must* be visible on the hardware wallet itself. Any data shown on a software wallet component is ignored for hardware wallet ratings.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full signing intent clarity, displaying all
				transaction details on the wallet screen/window for verification before signing.
			`),
			fullSigningIntentClarity(
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
					The wallet implements partial signing intent clarity, where most but not all transaction
					details are displayed on the wallet screen/window.
				`),
				partialSigningIntentClarity(
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
					The wallet implements basic signing intent clarity, but the implementation is limited
					and doesn't provide full transparency for all transaction details.
				`),
				basicSigningIntentClarity(
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
					The wallet does not implement effective signing intent clarity.
				`),
				noSigningIntentClarity(
					noDataExtraction,
					noCalldataDecoding,
					noDataExtraction,
					noCalldataDecoding,
					displaysNoTransactionDetails,
				).value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SigningIntentClarityValue> => {
		// Check if signing intent clarity feature exists
		if (features.security.signingIntentClarity === null) {
			return unrated(signingIntentClarity, brand, {
				messageExtraction: null,
				messageDecoding: null,
				calldataDecoding: null,
				calldataExtraction: null,
				displayedTransactionDetails: null,
			})
		}

		// Extract references from the wallet signing intent clarity feature
		const references = features.security.signingIntentClarity?.ref
			? refs(features.security.signingIntentClarity)
			: []

		const messageExtraction =
			features.security.signingIntentClarity.messageSigning.messageExtraction
		const messageDecoding = features.security.signingIntentClarity.messageSigning.calldataDecoding
		const calldataExtraction =
			features.security.signingIntentClarity.transactionSigning.calldataExtraction
		const calldataDecoding =
			features.security.signingIntentClarity.transactionSigning.calldataDecoding
		const displayedTransactionDetails =
			features.security.signingIntentClarity.transactionSigning.displayedTransactionDetails

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
				messageExtraction[DataExtraction.QRCODE] ||
				messageExtraction[DataExtraction.HASHES] ||
				messageExtraction[DataExtraction.COPY]

			// Either the wallet decodes it, or, you can extract it to decode it yourself
			const messageDecodingPass: boolean =
				messageDecoding[
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				] ||
				messageDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED] ||
				messageExtractionPass

			const calldataExtractionPass: boolean =
				calldataExtraction[DataExtraction.QRCODE] ||
				calldataExtraction[DataExtraction.HASHES] ||
				messageExtraction[DataExtraction.COPY]

			// Either the wallet decodes it, or, you can extract it to decode it yourself and it does a basic decoding
			const calldataDecodingPass: boolean =
				calldataDecoding[
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				] ||
				calldataDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED] ||
				(calldataExtractionPass &&
					(calldataDecoding[CalldataDecoding.ETH_USDC_TRANSFER] ||
						calldataDecoding[CalldataDecoding.ZKSYNC_USDC_TRANSFER] ||
						calldataDecoding[CalldataDecoding.AAVE_SUPPLY]))

			const displayedTransactionDetailsPass: boolean = isFullTransactionDetails(
				displayedTransactionDetails,
			)

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

		const result = ((): Evaluation<SigningIntentClarityValue> => {
			if (overallRating === Rating.UNRATED) {
				return unrated(signingIntentClarity, brand, {
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
				return noSigningIntentClarity(
					messageExtraction,
					messageDecoding,
					calldataExtraction,
					calldataDecoding,
					displayedTransactionDetails,
				)
			} else if (overallRating === Rating.PASS) {
				return fullSigningIntentClarity(
					messageExtraction,
					messageDecoding,
					calldataExtraction,
					calldataDecoding,
					displayedTransactionDetails,
				)
			} else {
				// Determine if it's basic or partial based on some features working
				const hasPartialSupport =
					!supportsAnyCalldataDecoding(messageDecoding) ||
					!supportsAnyCalldataDecoding(calldataDecoding)

				if (hasPartialSupport) {
					return partialSigningIntentClarity(
						messageExtraction,
						messageDecoding,
						calldataExtraction,
						calldataDecoding,
						displayedTransactionDetails,
					)
				} else {
					return basicSigningIntentClarity(
						messageExtraction,
						messageDecoding,
						calldataExtraction,
						calldataDecoding,
						displayedTransactionDetails,
					)
				}
			}
		})()

		// Return result with references
		return {
			...result,
			references,
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SigningIntentClarityValue>>) =>
		pickWorstRating<SigningIntentClarityValue>(perVariant),
}
