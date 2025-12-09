import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	CalldataDecoding,
	DataExtraction,
	isFullTransactionDetails,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
} from '@/schema/features/security/transaction-legibility'
import { isSupported } from '@/schema/features/support'
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
	references: Array<{ url: string; explanation: string }> = [],
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
		references: references.length > 0 ? references : [],
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
		Wallets are evaluated based on three key aspects of transaction legibility:

		**Calldata Decoding (legibility):**
		The wallet's ability to decode and display calldata for various transaction types, including:
		- Simple transfers (ETH_USDC_TRANSFER, ZKSYNC_USDC_TRANSFER)
		- Token approvals (USDC_APPROVAL)
		- DeFi interactions (AAVE_SUPPLY)
		- Complex nested transactions (SAFEWALLET_AAVE_SUPPLY_NESTED, SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND)

		**Transaction Details Display (detailsDisplayed):**
		The wallet's ability to display essential transaction information:
		- Gas limit and/or gas price
		- Transaction nonce
		- Sender address (from)
		- Recipient address (to)
		- Chain/network identifier
		- Transaction value/amount

		**Data Extraction (dataExtraction):**
		The wallet's ability to allow users to extract transaction data for verification:
		- Visual display (EYES): Users can view the data on the wallet screen
		- QR code (QRCODE): Users can scan a QR code to extract data
		- Hashes (HASHES): Users can compare hashes to verify data
		- Copy to clipboard (COPY): Users can copy the data directly (software wallets)

		A wallet receives a passing rating if it supports decoding of complex nested transactions AND displays all essential transaction details AND provides at least one data extraction method (visual display is acceptable, but advanced methods like QR codes or hashes are preferred).

		A wallet receives a partial rating if it has some combination of these features (decoding support, transaction details display, or data extraction methods), but not all at the full level.

		A wallet receives a failing rating if it lacks calldata decoding support, does not display essential transaction details, and provides no effective data extraction methods.

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
		if (
			features.security.transactionLegibility === null ||
			features.security.transactionLegibility.dataExtraction === null ||
			features.security.transactionLegibility.detailsDisplayed === null ||
			features.security.transactionLegibility.legibility === null
		) {
			return unrated(transactionLegibility, brand, null)
		}

		// Extract references from the wallet transaction legibility feature
		const references = refs(features.security.transactionLegibility)

		const legibility = features.security.transactionLegibility.legibility
		const detailsDisplayed = features.security.transactionLegibility.detailsDisplayed
		const dataExtraction = features.security.transactionLegibility.dataExtraction

		const getOverallRating = (): Rating => {
			if (legibility === null || detailsDisplayed === null || dataExtraction === null) {
				return Rating.UNRATED
			}

			// Check if wallet supports calldata decoding for complex transactions
			const supportsComplexDecoding: boolean =
				supportsAnyCalldataDecoding(legibility) &&
				(isSupported(
					legibility[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND],
				) ||
					isSupported(legibility[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]))

			// Check if wallet supports basic calldata decoding
			const supportsBasicDecoding: boolean =
				isSupported(legibility[CalldataDecoding.ETH_USDC_TRANSFER]) &&
				isSupported(legibility[CalldataDecoding.ZKSYNC_USDC_TRANSFER]) &&
				isSupported(legibility[CalldataDecoding.AAVE_SUPPLY])

			// Check if all transaction details are displayed
			const displaysAllDetails: boolean = isFullTransactionDetails(detailsDisplayed)

			// Check if wallet supports any data extraction method
			const hasDataExtraction: boolean = supportsAnyDataExtraction(dataExtraction)

			// Check if wallet supports advanced data extraction (more than just visual)
			const hasAdvancedDataExtraction: boolean =
				dataExtraction[DataExtraction.EYES] === true &&
				dataExtraction[DataExtraction.QRCODE] === true &&
				dataExtraction[DataExtraction.HASHES] === true &&
				dataExtraction[DataExtraction.COPY] === true

			// PASS: Full support - complex decoding AND all details displayed AND at least one data extraction method
			// Advanced extraction (QRCODE/HASHES/COPY) is preferred, but visual (EYES) is acceptable if all details are clearly displayed
			if (supportsComplexDecoding && displaysAllDetails && hasAdvancedDataExtraction) {
				return Rating.PASS
			}

			// FAIL: No decoding support AND missing essential details AND no data extraction
			if (!supportsAnyCalldataDecoding(legibility) && !displaysAllDetails && !hasDataExtraction) {
				return Rating.FAIL
			}

			// PARTIAL: Some support but not full
			// Has some combination of: basic/complex decoding, transaction details, or data extraction
			if (
				supportsBasicDecoding ||
				supportsComplexDecoding ||
				displaysAllDetails ||
				hasDataExtraction ||
				(supportsAnyCalldataDecoding(legibility) && !displaysAllDetails)
			) {
				return Rating.PARTIAL
			}

			// Default to PARTIAL if we have any support
			return Rating.PARTIAL
		}

		const overallRating = getOverallRating()

		const result = ((): Evaluation<TransactionLegibilityValue> => {
			if (overallRating === Rating.UNRATED) {
				return unrated(transactionLegibility, brand, null)
			}

			if (overallRating === Rating.FAIL) {
				return noTransactionLegibility()
			} else if (overallRating === Rating.PASS) {
				return fullTransactionLegibility()
			} else {
				// Determine if it's basic or partial based on decoding support
				const hasDecodingSupport = supportsAnyCalldataDecoding(legibility)
				const hasAllDetails = isFullTransactionDetails(detailsDisplayed)

				if (hasDecodingSupport && !hasAllDetails) {
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
