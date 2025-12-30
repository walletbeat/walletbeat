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
	type HardwareTransactionLegibilityImplementation,
	isFullTransactionDetails,
	isHardwareTransactionLegibility,
	isSupportedOnDevice,
	type SoftwareTransactionLegibilityImplementation,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { popRefs, refs } from '@/schema/reference'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transaction_legibility'

export type TransactionLegibilityValue = Value & {
	__brand: 'attributes.transaction_legibility'
}

// Hardware wallet evaluation helpers
function hardwareNoTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'hardware_no_transaction_legibility',
			rating: Rating.FAIL,
			displayName: 'Unclear transaction details',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not display clear transaction details on the hardware device when signing.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} implements either zero or very little transaction legibility on the hardware device itself. Transaction legibility is important for security as it allows users to verify transaction details directly on their hardware wallet screen before signing, without relying on potentially compromised software.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement comprehensive transaction legibility on the hardware device itself, including calldata decoding for complex transactions, display of all essential transaction details, and data extraction methods (QR codes, hashes) to allow users to verify transaction details independently.',
		),
	}
}

function hardwareBasicTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'hardware_basic_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Basic transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports basic transaction legibility on the hardware device.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports basic transaction legibility on the hardware device, but the implementation does not provide full transparency. The device may display some transaction details or support basic calldata decoding, but lacks comprehensive support for complex transactions, all essential details, or advanced data extraction methods.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should improve its transaction legibility implementation to support decoding of complex nested transactions, display all essential transaction details on the device, and provide data extraction methods for independent verification.',
		),
	}
}

function hardwarePartialTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'hardware_partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports partial transaction legibility on the hardware device.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports partial transaction legibility on the hardware device. The device displays most transaction details and may support calldata decoding for some transaction types, but may not fully decode complex nested transactions or provide all data extraction methods. Showing transaction details directly on the hardware device is crucial for security as it allows users to verify transaction details independently of potentially compromised software.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should extend its transaction legibility implementation to support decoding of complex nested transactions, ensure all essential transaction details are displayed on the device, and provide comprehensive data extraction methods (QR codes, hashes) for independent verification.',
		),
	}
}

function hardwareFullTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'hardware_full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports full transaction legibility on the hardware device.',
			),
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements full transaction legibility on the hardware device itself. All transaction details are clearly displayed on the device screen, the device supports decoding of complex nested transactions, and provides comprehensive data extraction methods (QR codes, hashes) for independent verification before signing, providing maximum security and transparency for users.',
		),
	}
}

// Software wallet evaluation helpers
function softwareNoTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'software_no_transaction_legibility',
			rating: Rating.FAIL,
			displayName: 'Unclear transaction details',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not display clear transaction details when signing.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} implements either zero or very little transaction legibility. The wallet does not adequately display calldata in multiple formats (raw hex, formatted, copyable) or essential transaction details (gas, nonce, from, to, chain, value). Transaction legibility is important for security as it allows users to verify transaction details on their wallet screen before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement comprehensive transaction legibility, including the ability to display calldata in raw hex format, formatted output, and allow copying to clipboard, as well as displaying all essential transaction details for user verification.',
		),
	}
}

function softwarePartialTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'software_partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports partial transaction legibility.'),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports some transaction legibility features, but not all. The wallet may display some calldata formats or some transaction details, but lacks comprehensive support for all calldata display methods (raw hex, formatted, copyable) or all essential transaction details (gas, nonce, from, to, chain, value). Showing transaction details is crucial for security as it allows users to verify transaction details before signing.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should extend its transaction legibility implementation to support all calldata display methods (raw hex display, formatted output, copy to clipboard) and ensure all essential transaction details (gas, nonce, from, to, chain, value) are clearly displayed for user verification.',
		),
	}
}

function softwareFullTransactionLegibility(): Evaluation<TransactionLegibilityValue> {
	return {
		value: {
			id: 'software_full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports full transaction legibility.'),
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements full transaction legibility. The wallet supports comprehensive calldata display (raw hex format, formatted output, and copy to clipboard) and displays all essential transaction details clearly on the wallet screen/window for verification before signing, providing maximum security and transparency for users.',
		),
	}
}

function evaluateHardwareWalletTransactionLegibility(
	hardwareTransactionLegibility: HardwareTransactionLegibilityImplementation,
): Evaluation<TransactionLegibilityValue> {
	const references = refs(hardwareTransactionLegibility)

	const legibility = hardwareTransactionLegibility.legibility
	const detailsDisplayed = hardwareTransactionLegibility.detailsDisplayed
	const dataExtraction = hardwareTransactionLegibility.dataExtraction

	const getOverallRating = (): Rating => {
		if (legibility === null || detailsDisplayed === null || dataExtraction === null) {
			return Rating.UNRATED
		}

		// Check if wallet supports calldata decoding for complex transactions (ON_DEVICE)
		const supportsComplexDecoding: boolean =
			supportsAnyCalldataDecoding(legibility) &&
			(isSupportedOnDevice(
				legibility,
				CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
			) ||
				isSupportedOnDevice(legibility, CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED))

		// Check if wallet supports basic calldata decoding (ON_DEVICE)
		const supportsBasicDecoding: boolean =
			isSupportedOnDevice(legibility, CalldataDecoding.ETH_USDC_TRANSFER) &&
			isSupportedOnDevice(legibility, CalldataDecoding.ZKSYNC_USDC_TRANSFER) &&
			isSupportedOnDevice(legibility, CalldataDecoding.AAVE_SUPPLY)

		// Check if all transaction details are displayed
		const displaysAllDetails: boolean = isFullTransactionDetails(detailsDisplayed)

		// Check if wallet supports any data extraction method
		const hasDataExtraction: boolean = supportsAnyDataExtraction(dataExtraction)

		// Check if wallet supports advanced data extraction (more than just visual)
		const hasAdvancedDataExtraction: boolean =
			dataExtraction[DataExtraction.EYES] === true &&
			dataExtraction[DataExtraction.QRCODE] === true &&
			dataExtraction[DataExtraction.HASHES] === true

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
			return hardwareNoTransactionLegibility()
		} else if (overallRating === Rating.PASS) {
			return hardwareFullTransactionLegibility()
		} else {
			const hasDecodingSupport = legibility !== null && supportsAnyCalldataDecoding(legibility)
			const hasAllDetails = detailsDisplayed !== null && isFullTransactionDetails(detailsDisplayed)

			if (hasDecodingSupport && !hasAllDetails) {
				return hardwarePartialTransactionLegibility()
			} else {
				return hardwareBasicTransactionLegibility()
			}
		}
	})()

	// Return result with references
	return {
		...result,
		references,
	}
}

function evaluateSoftwareWalletTransactionLegibility(
	softwareTransactionLegibility: SoftwareTransactionLegibilityImplementation,
): Evaluation<TransactionLegibilityValue> {
	const { withoutRefs: transactionLegibilitySupport } = popRefs(softwareTransactionLegibility)

	const calldataDisplay = transactionLegibilitySupport.calldataDisplay
	const transactionDetailsDisplay = transactionLegibilitySupport.transactionDetailsDisplay

	if (calldataDisplay === null || transactionDetailsDisplay === null) {
		return unrated(transactionLegibility, brand, null)
	}

	// Check calldata display capabilities
	const calldataShown = calldataDisplay.rawHex
	const calldataCopyable = calldataDisplay.copyHexToClipboard
	const calldataFormatted = calldataDisplay.formatted

	// For DisplayedTransactionDetails, SHOWN_BY_DEFAULT or SHOWN_OPTIONALLY count as supported
	const transactionDetailsRatings = [
		transactionDetailsDisplay.gas === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.gas === TransactionDisplayOptions.SHOWN_OPTIONALLY,
		transactionDetailsDisplay.nonce === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.nonce === TransactionDisplayOptions.SHOWN_OPTIONALLY,
		transactionDetailsDisplay.from === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.from === TransactionDisplayOptions.SHOWN_OPTIONALLY,
		transactionDetailsDisplay.to === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.to === TransactionDisplayOptions.SHOWN_OPTIONALLY,
		transactionDetailsDisplay.chain === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.chain === TransactionDisplayOptions.SHOWN_OPTIONALLY,
		transactionDetailsDisplay.value === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
			transactionDetailsDisplay.value === TransactionDisplayOptions.SHOWN_OPTIONALLY,
	]

	const transactionDetailsCount = transactionDetailsRatings.filter(r => r).length
	const allTransactionDetailsShown = transactionDetailsCount === transactionDetailsRatings.length

	// Hierarchical scoring logic:
	// 1. If no calldata shown at all, FAIL
	// 2. If calldata is shown but neither copyable nor formatted, FAIL
	// 3. If less than 3 types of transaction details shown, FAIL
	// 4. If calldata is not copyable OR not formatted, PARTIAL
	// 5. If more than 3 types of transaction details are shown but not all of them, PARTIAL
	// 6. Otherwise, PASS
	let rating: Rating

	if (!calldataShown) {
		// No calldata shown at all
		rating = Rating.FAIL
	} else if (!calldataCopyable && !calldataFormatted) {
		// Calldata shown but neither copyable nor formatted
		rating = Rating.FAIL
	} else if (transactionDetailsCount < 3) {
		// Less than 3 types of transaction details shown
		rating = Rating.FAIL
	} else if (!calldataCopyable || !calldataFormatted) {
		// Calldata is not copyable OR not formatted
		rating = Rating.PARTIAL
	} else if (transactionDetailsCount >= 3 && !allTransactionDetailsShown) {
		// More than 3 types of transaction details are shown but not all of them
		rating = Rating.PARTIAL
	} else {
		// Calldata is both copyable AND formatted, and all transaction details are shown
		rating = Rating.PASS
	}

	const references = refs(softwareTransactionLegibility)

	const result = ((): Evaluation<TransactionLegibilityValue> => {
		if (rating === Rating.FAIL) {
			return softwareNoTransactionLegibility()
		} else if (rating === Rating.PASS) {
			return softwareFullTransactionLegibility()
		} else {
			return softwarePartialTransactionLegibility()
		}
	})()

	return {
		...result,
		...(references.length > 0 && { references }),
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
		Wallets are evaluated based on key aspects of transaction legibility, with different criteria for software and hardware wallets:

		**Calldata Decoding/Display:**
		The wallet's ability to decode and display calldata for various transaction types, including:
		- Simple transfers
		- Token approvals
		- DeFi interactions
		- Complex nested transactions

		**Transaction Details Display:**
		The wallet's ability to display essential transaction information:
		- Gas limit and/or gas price
		- Transaction nonce
		- Sender address (from)
		- Recipient address (to)
		- Chain/network identifier
		- Transaction value/amount

		**Software Wallet Specific Requirements:**
		For software wallets, calldata must be displayed in multiple formats:
		- Raw hex format: Users can view the raw hexadecimal calldata
		- Formatted output: Users can view decoded, human-readable calldata
		- Copy to clipboard: Users can copy the calldata directly for verification

		**Hardware Wallet Specific Requirements:**
		For hardware wallets, the signature/transaction information *must* be visible on the hardware wallet device itself. Any data shown on a software wallet component is ignored for hardware wallet ratings.

		Hardware wallets must also provide data extraction methods to allow users to independently verify transaction data:
		- Visual display: Users can view the data on the hardware wallet screen
		- QR code: Users can scan a QR code displayed on the device to extract data
		- Hashes: Users can compare hashes displayed on the device to verify data

		**Rating Criteria:**

		For software wallets:
		- A wallet receives a passing rating if it displays calldata in all three formats (raw hex, formatted, copyable) and displays all essential transaction details.
		- A wallet receives a partial rating if it has some combination of these features, but not all at the full level.
		- A wallet receives a failing rating if it lacks calldata display capabilities or does not display essential transaction details.

		For hardware wallets:
		- A wallet receives a passing rating if it supports decoding of complex nested transactions, displays all essential transaction details on the device, and provides comprehensive data extraction methods (QR codes and hashes, in addition to visual display).
		- A wallet receives a partial rating if it has some combination of these features (decoding support, transaction details display, or data extraction methods), but not all at the full level.
		- A wallet receives a failing rating if it lacks calldata decoding support, does not display essential transaction details on the device, and provides no effective data extraction methods.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
		pass: [
			exampleRating(
				paragraph(`
					The hardware wallet implements full transaction legibility, displaying all
					transaction details on the hardware device screen for verification before signing.
				`),
				hardwareFullTransactionLegibility(),
			),
			exampleRating(
				paragraph(`
					The software wallet implements full transaction legibility, displaying all
					transaction details on the wallet screen/window for verification before signing.
				`),
				softwareFullTransactionLegibility(),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
					The hardware wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the hardware device screen.
				`),
				hardwarePartialTransactionLegibility(),
			),
			exampleRating(
				paragraph(`
					The hardware wallet implements basic transaction legibility, but the implementation is limited
					and doesn't provide full transparency for all transaction details on the device.
				`),
				hardwareBasicTransactionLegibility(),
			),
			exampleRating(
				paragraph(`
					The software wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the wallet screen/window.
				`),
				softwarePartialTransactionLegibility(),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The hardware wallet does not implement effective transaction legibility on the device itself.
				`),
				hardwareNoTransactionLegibility(),
			),
			exampleRating(
				paragraph(`
					The software wallet does not implement effective transaction legibility.
				`),
				softwareNoTransactionLegibility(),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<TransactionLegibilityValue> => {
		if (features.security.transactionLegibility === null) {
			return unrated(transactionLegibility, brand, null)
		}

		if (isHardwareTransactionLegibility(features.security.transactionLegibility)) {
			return evaluateHardwareWalletTransactionLegibility(features.security.transactionLegibility)
		}

		return evaluateSoftwareWalletTransactionLegibility(features.security.transactionLegibility)
	},
	aggregate: pickWorstRating<TransactionLegibilityValue>,
}
