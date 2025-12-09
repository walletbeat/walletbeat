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
} from '@/schema/features/security/transaction-legibility'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
	isFullTransactionDetails,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
} from '@/schema/features/security/transaction-legibility'
import { refs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transaction-legibility'

export type TransactionLegibilityValue = Value & {
	__brand: 'attributes.transaction-legibility'
}

function noTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'no_transaction_legibility',
			rating: Rating.FAIL,
			displayName: 'Unclear transaction details',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not display clear transaction details when signing.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} implements either zero or very little transaction legibility. Transaction legibility is important for security as it allows users to verify transaction details on their wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement comprehensive transaction legibility to improve security by allowing users to verify transaction details on their device.',
		),
	}
}

function basicTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'basic_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Basic transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports basic transaction legibility.'),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports basic transaction legibility, but the implementation does not provide full transparency for all transaction details. Transaction legibility is important for security as it allows users to verify transaction details on their wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should improve its transaction legibility implementation to provide full transparency for all transaction details and better calldata extraction methods.',
		),
	}
}

function partialTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports partial transaction legibility.'),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports partial transaction legibility. Most transaction details are displayed on the wallet screen/window for verification, but some complex transactions may not show all details. Showing transaction details (transaction legibility) is crucial for security as it allows users to verify transaction details before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should extend its transaction legibility implementation to cover all transaction types and ensure all details are clearly displayed with better extraction methods.',
		),
	}
}

function fullTransactionLegibility(
	refs: Array<{ url: string; explanation: string }> = [],
): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports full transaction legibility.'),
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} full transaction legibility. All transaction details are clearly displayed on the wallet screen/window for verification before signing, providing maximum security and transparency for users.',
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

export const transactionLegibility: Attribute<TransactionLegibilityValue> = {
	id: 'transactionLegibility',
	icon: '\u{1F50F}', // Lock with pen
	displayName: 'Transaction Legibility',
	wording: {
		midSentenceName: null,
		howIsEvaluated: 'How is a wallet evaluated for clearly showing what users are signing?',
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to make it easy for users to understand what they are signing?',
		),
	},
	question: sentence(
		'When signing a transaction, does the wallet show transaction details clearly?',
	),
	why: markdown(`
		Transaction legibility is a critical security feature for wallets that allows users to verify
		transaction details directly on their wallet's screen/window before signing. This verification
		step is crucial for preventing attacks where malicious software might attempt to trick users
		into signing transactions with different parameters than what they intended.
		
		Without this, users are at the mercy of the app they are interacting with sending them a bad transactions, either because they have a bug, were hacked, or are malicious. Without a signer being able to verify if their transaction is correct, user should not send such a transaction.
		
		Full transaction legibility implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the wallet screen, EIP-712 message hashes,
		and decoded calldata, allowing users to make informed decisions before authorizing transactions.
	`),
	methodology: markdown(`
		Wallets are evaluated based on how clearly they display transaction details for a specific set of benchmark transactions.

		A wallet receives a passing rating if it implements full transaction legibility, where all transaction
		details are clearly displayed on the wallet screen for verification before signing. This includes
		support for standard transactions, ERC-20 token transfers, EIP-712 messages and complex contract interactions. 
		
		A wallet receives a partial rating if it implements transaction legibility but with limitations, such
		as not displaying all transaction details or not supporting transaction legibility for all transaction types.
		
		A hardware wallet fails this attribute if it doesn't properly implement transaction legibility functionality,
		requiring users to trust the connected software wallet without independent verification.

		For hardware wallets, the signature/transaction information *must* be visible on the hardware wallet itself. Any data shown on a software wallet component is ignored for hardware wallet ratings.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full transaction legibility, displaying all
				transaction details on the wallet screen/window for verification before signing.
			`),
			fullTransactionLegibility(),
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the wallet screen/window.
				`),
				partialTransactionLegibility(),
			),
			exampleRating(
				paragraph(`
					The wallet implements basic transaction legibility, but the implementation is limited
					and doesn't provide full transparency for all transaction details.
				`),
				basicTransactionLegibility(),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not implement effective transaction legibility.
				`),
				noTransactionLegibility(),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<TransactionLegibilityValue> => {
		// Check if transaction legibility feature exists
		if (features.security.transactionLegibility === null) {
			return unrated(transactionLegibility, brand, null)
		}

		// Extract references from the wallet transaction legibility feature
		const references = refs(features.security.transactionLegibility)

		const messageExtraction =
			features.security.transactionLegibility.messageSigning.messageExtraction
		const messageDecoding = features.security.transactionLegibility.messageSigning.calldataDecoding
		const calldataExtraction =
			features.security.transactionLegibility.transactionSigning.calldataExtraction
		const calldataDecoding =
			features.security.transactionLegibility.transactionSigning.calldataDecoding
		const displayedTransactionDetails =
			features.security.transactionLegibility.transactionSigning.displayedTransactionDetails

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
			const messageExtractionPass: boolean | null =
				messageExtraction[DataExtraction.QRCODE] ||
				messageExtraction[DataExtraction.HASHES] ||
				messageExtraction[DataExtraction.COPY]

			// Either the wallet decodes it, or, you can extract it to decode it yourself
			const messageDecodingPass: boolean | null =
				messageDecoding[
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				] ||
				messageDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED] ||
				messageExtractionPass

			const calldataExtractionPass: boolean | null =
				calldataExtraction[DataExtraction.QRCODE] ||
				calldataExtraction[DataExtraction.HASHES] ||
				messageExtraction[DataExtraction.COPY]

			// Either the wallet decodes it, or, you can extract it to decode it yourself and it does a basic decoding
			const calldataDecodingPass: boolean | null =
				calldataDecoding[
					CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				] ||
				calldataDecoding[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED] ||
				(calldataExtractionPass &&
					(calldataDecoding[CalldataDecoding.ETH_USDC_TRANSFER] ||
						calldataDecoding[CalldataDecoding.ZKSYNC_USDC_TRANSFER] ||
						calldataDecoding[CalldataDecoding.AAVE_SUPPLY]))

			const displayedTransactionDetailsPass: boolean | null = isFullTransactionDetails(
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

		const result = ((): Evaluation<TransactionLegibilityValue> => {
			if (overallRating === Rating.UNRATED) {
				return unrated(transactionLegibility, brand, null)
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
				return noTransactionLegibility()
			} else if (overallRating === Rating.PASS) {
				return fullTransactionLegibility()
			} else {
				// Determine if it's basic or partial based on some features working
				const hasPartialSupport =
					!supportsAnyCalldataDecoding(messageDecoding) ||
					!supportsAnyCalldataDecoding(calldataDecoding)

				if (hasPartialSupport) {
					return partialTransactionLegibility()
				} else {
					return basicTransactionLegibility()
				}
			}
		})()

		// Return result with references
		return {
			...result,
			references,
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<TransactionLegibilityValue>>) =>
		pickWorstRating<TransactionLegibilityValue>(perVariant),
}
