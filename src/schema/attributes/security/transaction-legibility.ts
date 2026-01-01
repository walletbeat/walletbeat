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
	DataDecoded,
	DataExtraction,
	type HardwareMessageSigningLegibility,
	type HardwareTransactionLegibilityImplementation,
	isFullTransactionDetails,
	isHardwareTransactionLegibility,
	isSupportedOnDevice,
	MessageSigningProvides,
	type SoftwareMessageSigningLegibility,
	type SoftwareTransactionLegibilityImplementation,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { isSupported } from '@/schema/features/support'
import { popRefs, refs } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transaction_legibility'

export type TransactionLegibilityValue = Value & {
	__brand: 'attributes.transaction_legibility'
}

// Message signing evaluation helpers

/**
 * Evaluates if software wallet message signing meets PASS criteria.
 * PASS if showing: EIP-712 struct OR (domainHash & messageHash) OR safeHash
 */
function evaluateSoftwareMessageSigning(
	messageSigningLegibility: SoftwareMessageSigningLegibility,
): boolean {
	if (messageSigningLegibility === null) {
		return false
	}

	const hasEip712Struct = messageSigningLegibility[MessageSigningProvides.EIP712_STRUCT]
	const hasDomainHash = messageSigningLegibility[MessageSigningProvides.DOMAIN_HASH]
	const hasMessageHash = messageSigningLegibility[MessageSigningProvides.MESSAGE_HASH]
	const hasSafeHash = messageSigningLegibility[MessageSigningProvides.SAFE_HASH]

	// PASS if: EIP-712 struct OR (domainHash AND messageHash) OR safeHash
	return hasEip712Struct || (hasDomainHash && hasMessageHash) || hasSafeHash
}

/**
 * Evaluates if hardware wallet message signing meets PASS criteria.
 * PASS if showing: (EIP-712 struct OR (domainHash & messageHash) OR safeHash) AND on-device
 */
function evaluateHardwareMessageSigning(
	messageSigningLegibility: HardwareMessageSigningLegibility,
): boolean {
	if (messageSigningLegibility === null) {
		return false
	}

	if (messageSigningLegibility.decoded !== DataDecoded.ON_DEVICE) {
		return false
	}

	const provides = messageSigningLegibility.messageSigningProvides
	const hasEip712Struct = provides[MessageSigningProvides.EIP712_STRUCT]
	const hasDomainHash = provides[MessageSigningProvides.DOMAIN_HASH]
	const hasMessageHash = provides[MessageSigningProvides.MESSAGE_HASH]
	const hasSafeHash = provides[MessageSigningProvides.SAFE_HASH]

	// PASS if: EIP-712 struct OR (domainHash AND messageHash) OR safeHash
	return hasEip712Struct || (hasDomainHash && hasMessageHash) || hasSafeHash
}

// Hardware wallet detail generation helpers
interface HardwareFeatureDetails {
	calldataDecoding: {
		supported: string[]
		missing: string[]
		decodedLocation: DataDecoded | null
	}
	transactionDetails: {
		supported: string[]
		missing: string[]
	}
	dataExtraction: {
		supported: string[]
		missing: string[]
	}
	messageSigning: {
		supported: string[]
		missing: string[]
		decodedLocation: DataDecoded | null
	}
}

function analyzeHardwareFeatures(
	legibility: HardwareTransactionLegibilityImplementation['legibility'],
	detailsDisplayed: HardwareTransactionLegibilityImplementation['detailsDisplayed'],
	dataExtraction: HardwareTransactionLegibilityImplementation['dataExtraction'],
	messageSigningLegibility: HardwareTransactionLegibilityImplementation['messageSigningLegibility'],
): HardwareFeatureDetails {
	const details: HardwareFeatureDetails = {
		calldataDecoding: { supported: [], missing: [], decodedLocation: null },
		transactionDetails: { supported: [], missing: [] },
		dataExtraction: { supported: [], missing: [] },
		messageSigning: { supported: [], missing: [], decodedLocation: null },
	}

	// Analyze calldata decoding
	if (legibility !== null) {
		const decodingChecks = [
			{
				key: CalldataDecoding.ETH_USDC_TRANSFER,
				label: 'basic token transfers (ERC-20)',
			},
			{
				key: CalldataDecoding.ZKSYNC_USDC_TRANSFER,
				label: 'ZKSync token transfers',
			},
			{
				key: CalldataDecoding.AAVE_SUPPLY,
				label: 'DeFi interactions (e.g., Aave)',
			},
			{
				key: CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED,
				label: 'nested Safe transactions',
			},
			{
				key: CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
				label: 'complex nested multisend transactions',
			},
		]

		// Track decoded location for calldata decoding
		// If any supported decoding is ON_DEVICE, show ON_DEVICE; otherwise show OFF_DEVICE if any are supported
		let calldataDecodedLocation: DataDecoded | null = null
		let hasOnDeviceDecoding = false
		let hasOffDeviceDecoding = false

		decodingChecks.forEach(({ key, label }) => {
			const support = legibility[key]

			if (isSupported(support)) {
				const decodedLocation = support.decoded

				if (decodedLocation === DataDecoded.ON_DEVICE) {
					hasOnDeviceDecoding = true
				} else {
					hasOffDeviceDecoding = true
				}

				if (isSupportedOnDevice(legibility, key)) {
					details.calldataDecoding.supported.push(label)
				} else {
					details.calldataDecoding.missing.push(label)
				}
			} else {
				details.calldataDecoding.missing.push(label)
			}
		})

		// Prefer ON_DEVICE if any decoding is ON_DEVICE, otherwise use OFF_DEVICE if any are supported
		if (hasOnDeviceDecoding) {
			calldataDecodedLocation = DataDecoded.ON_DEVICE
		} else if (hasOffDeviceDecoding) {
			calldataDecodedLocation = DataDecoded.OFF_DEVICE
		}

		details.calldataDecoding.decodedLocation = calldataDecodedLocation
	}

	// Analyze transaction details
	if (detailsDisplayed !== null) {
		const detailChecks = [
			{ key: 'gas', value: detailsDisplayed.gas, label: 'Gas limit/price' },
			{ key: 'nonce', value: detailsDisplayed.nonce, label: 'Transaction nonce' },
			{ key: 'from', value: detailsDisplayed.from, label: 'Sender address' },
			{ key: 'to', value: detailsDisplayed.to, label: 'Recipient address' },
			{ key: 'chain', value: detailsDisplayed.chain, label: 'Chain/network' },
			{ key: 'value', value: detailsDisplayed.value, label: 'Transaction value' },
		]

		detailChecks.forEach(({ value, label }) => {
			if (value === TransactionDisplayOptions.SHOWN_BY_DEFAULT) {
				details.transactionDetails.supported.push(label)
			} else {
				details.transactionDetails.missing.push(label)
			}
		})
	}

	// Analyze data extraction
	if (dataExtraction !== null) {
		const extractionChecks = [
			{ key: DataExtraction.EYES, label: 'Visual display on device' },
			{ key: DataExtraction.QRCODE, label: 'QR code export' },
			{ key: DataExtraction.HASHES, label: 'Hash display for verification' },
		]

		extractionChecks.forEach(({ key, label }) => {
			if (dataExtraction[key] === true) {
				details.dataExtraction.supported.push(label)
			} else {
				details.dataExtraction.missing.push(label)
			}
		})
	}

	// Analyze message signing
	if (messageSigningLegibility !== null) {
		const provides = messageSigningLegibility.messageSigningProvides
		const decodedLocation = messageSigningLegibility.decoded
		const onDevice = decodedLocation === DataDecoded.ON_DEVICE

		details.messageSigning.decodedLocation = decodedLocation

		const signingChecks = [
			{ key: MessageSigningProvides.EIP712_STRUCT, label: 'EIP-712 structured data' },
			{ key: MessageSigningProvides.DOMAIN_HASH, label: 'Domain hash' },
			{ key: MessageSigningProvides.MESSAGE_HASH, label: 'Message hash' },
			{ key: MessageSigningProvides.SAFE_HASH, label: 'Safe hash' },
		]

		if (onDevice) {
			signingChecks.forEach(({ key, label }) => {
				if (provides[key]) {
					details.messageSigning.supported.push(label)
				} else {
					details.messageSigning.missing.push(label)
				}
			})
		} else {
			details.messageSigning.missing.push('On-device message signing display')
		}
	}

	return details
}

function generateHardwareDetailsMarkdown(features: HardwareFeatureDetails): string {
	const sections: string[] = []

	// Calldata Decoding section
	// Calldata Decoding section
	if (
		features.calldataDecoding.supported.length > 0 ||
		features.calldataDecoding.missing.length > 0
	) {
		sections.push('**Calldata Decoding**\n')

		if (features.calldataDecoding.decodedLocation === DataDecoded.ON_DEVICE) {
			sections.push('Decoded on-device.\n')
		} else if (features.calldataDecoding.decodedLocation === DataDecoded.OFF_DEVICE) {
			sections.push('Decoded off-device.\n')
		}

		if (features.calldataDecoding.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.calldataDecoding.supported)}\n`)
		}

		if (features.calldataDecoding.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.calldataDecoding.missing)}\n`)
		}
	}

	// Message Signing section
	if (features.messageSigning.supported.length > 0 || features.messageSigning.missing.length > 0) {
		sections.push('\n**Message Signing**\n')

		if (features.messageSigning.decodedLocation === DataDecoded.ON_DEVICE) {
			sections.push('Displayed on-device.\n')
		} else if (features.messageSigning.decodedLocation === DataDecoded.OFF_DEVICE) {
			sections.push('Displayed off-device.\n')
		}

		if (features.messageSigning.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.messageSigning.supported)}\n`)
		}

		if (features.messageSigning.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.messageSigning.missing)}\n`)
		}
	}

	return sections.join('\n')
}

function generateHardwareHowToImprove(features: HardwareFeatureDetails): string {
	const improvements: string[] = []

	if (features.calldataDecoding.missing.length > 0) {
		improvements.push(
			`**Calldata Decoding:** Add on-device support for ${commaListFormat(features.calldataDecoding.missing)}`,
		)
	}

	if (features.calldataDecoding.decodedLocation === DataDecoded.OFF_DEVICE) {
		improvements.push(
			'**Calldata Decoding:** Move decoding on-device so users don’t have to trust a potentially compromised companion app.',
		)
	}

	if (features.transactionDetails.missing.length > 0) {
		improvements.push(
			`**Transaction Details:** Display ${commaListFormat(features.transactionDetails.missing)} on the device`,
		)
	}

	if (features.messageSigning.decodedLocation === DataDecoded.OFF_DEVICE) {
		improvements.push(
			'**Message Signing:** Display message signing details on-device to prevent host software from altering what the user thinks they are approving.',
		)
	}

	if (features.dataExtraction.missing.length > 0) {
		improvements.push(
			`**Data Extraction:** Implement ${commaListFormat(features.dataExtraction.missing)} to allow independent verification`,
		)
	}

	if (features.messageSigning.missing.length > 0) {
		improvements.push(
			`**Message Signing:** Add on-device display for ${commaListFormat(features.messageSigning.missing)}`,
		)
	}

	if (improvements.length === 0) {
		return 'No improvements needed - the wallet implements full transaction legibility.'
	}

	return improvements.join('\n\n')
}

// Hardware wallet evaluation helpers
function hardwareNoTransactionLegibility(
	legibility: HardwareTransactionLegibilityImplementation['legibility'],
	detailsDisplayed: HardwareTransactionLegibilityImplementation['detailsDisplayed'],
	dataExtraction: HardwareTransactionLegibilityImplementation['dataExtraction'],
	messageSigningLegibility: HardwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeHardwareFeatures(
		legibility,
		detailsDisplayed,
		dataExtraction,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

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
		details: markdown(
			`{{WALLET_NAME}} implements either zero or very little transaction legibility on the hardware device itself. Transaction legibility is important for security as it allows users to verify transaction details directly on their hardware wallet screen before signing, without relying on potentially compromised software.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements to provide comprehensive transaction legibility on the hardware device:\n\n${improvementsMarkdown}`,
		),
	}
}

function hardwareBasicTransactionLegibility(
	legibility: HardwareTransactionLegibilityImplementation['legibility'],
	detailsDisplayed: HardwareTransactionLegibilityImplementation['detailsDisplayed'],
	dataExtraction: HardwareTransactionLegibilityImplementation['dataExtraction'],
	messageSigningLegibility: HardwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeHardwareFeatures(
		legibility,
		detailsDisplayed,
		dataExtraction,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

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
		details: markdown(
			`{{WALLET_NAME}} supports basic transaction legibility on the hardware device, but the implementation does not provide full transparency. The device may display some transaction details or support basic calldata decoding, but lacks comprehensive support for complex transactions, all essential details, or advanced data extraction methods.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	}
}

function hardwarePartialTransactionLegibility(
	legibility: HardwareTransactionLegibilityImplementation['legibility'],
	detailsDisplayed: HardwareTransactionLegibilityImplementation['detailsDisplayed'],
	dataExtraction: HardwareTransactionLegibilityImplementation['dataExtraction'],
	messageSigningLegibility: HardwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeHardwareFeatures(
		legibility,
		detailsDisplayed,
		dataExtraction,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

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
		details: markdown(
			`{{WALLET_NAME}} supports partial transaction legibility on the hardware device. The device displays most transaction details and may support calldata decoding for some transaction types, but may not fully decode complex nested transactions or provide all data extraction methods. Showing transaction details directly on the hardware device is crucial for security as it allows users to verify transaction details independently of potentially compromised software.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	}
}

function hardwareFullTransactionLegibility(
	legibility: HardwareTransactionLegibilityImplementation['legibility'],
	detailsDisplayed: HardwareTransactionLegibilityImplementation['detailsDisplayed'],
	dataExtraction: HardwareTransactionLegibilityImplementation['dataExtraction'],
	messageSigningLegibility: HardwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeHardwareFeatures(
		legibility,
		detailsDisplayed,
		dataExtraction,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)

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
		details: markdown(
			`{{WALLET_NAME}} implements full transaction legibility on the hardware device itself. All transaction details are clearly displayed on the device screen, the device supports decoding of complex nested transactions, and provides comprehensive data extraction methods (QR codes, hashes) for independent verification before signing, providing maximum security and transparency for users.\n\n${featureDetailsMarkdown}`,
		),
	}
}

// Software wallet detail generation helpers
interface SoftwareFeatureDetails {
	calldataDisplay: {
		supported: string[]
		missing: string[]
	}
	transactionDetails: {
		supported: string[]
		missing: string[]
	}
	messageSigning: {
		supported: string[]
		missing: string[]
	}
}

function analyzeSoftwareFeatures(
	calldataDisplay: SoftwareTransactionLegibilityImplementation['calldataDisplay'],
	transactionDetailsDisplay: SoftwareTransactionLegibilityImplementation['transactionDetailsDisplay'],
	messageSigningLegibility: SoftwareTransactionLegibilityImplementation['messageSigningLegibility'],
): SoftwareFeatureDetails {
	const details: SoftwareFeatureDetails = {
		calldataDisplay: { supported: [], missing: [] },
		transactionDetails: { supported: [], missing: [] },
		messageSigning: { supported: [], missing: [] },
	}

	// Analyze calldata display
	if (calldataDisplay !== null) {
		const displayChecks = [
			{ key: 'rawHex', value: calldataDisplay.rawHex, label: 'Raw hex display' },
			{ key: 'formatted', value: calldataDisplay.formatted, label: 'Formatted display' },
			{
				key: 'copyHexToClipboard',
				value: calldataDisplay.copyHexToClipboard,
				label: 'Copy to clipboard',
			},
		]

		displayChecks.forEach(({ value, label }) => {
			if (value === true) {
				details.calldataDisplay.supported.push(label)
			} else {
				details.calldataDisplay.missing.push(label)
			}
		})
	}

	// Analyze transaction details
	if (transactionDetailsDisplay !== null) {
		const detailChecks = [
			{ key: 'gas', value: transactionDetailsDisplay.gas, label: 'Gas limit/price' },
			{ key: 'nonce', value: transactionDetailsDisplay.nonce, label: 'Transaction nonce' },
			{ key: 'from', value: transactionDetailsDisplay.from, label: 'Sender address' },
			{ key: 'to', value: transactionDetailsDisplay.to, label: 'Recipient address' },
			{ key: 'chain', value: transactionDetailsDisplay.chain, label: 'Chain/network' },
			{ key: 'value', value: transactionDetailsDisplay.value, label: 'Transaction value' },
		]

		detailChecks.forEach(({ value, label }) => {
			if (
				value === TransactionDisplayOptions.SHOWN_BY_DEFAULT ||
				value === TransactionDisplayOptions.SHOWN_OPTIONALLY
			) {
				details.transactionDetails.supported.push(label)
			} else {
				details.transactionDetails.missing.push(label)
			}
		})
	}

	// Analyze message signing
	if (messageSigningLegibility !== null) {
		const signingChecks = [
			{ key: MessageSigningProvides.EIP712_STRUCT, label: 'EIP-712 structured data' },
			{ key: MessageSigningProvides.DOMAIN_HASH, label: 'Domain hash' },
			{ key: MessageSigningProvides.MESSAGE_HASH, label: 'Message hash' },
			{ key: MessageSigningProvides.SAFE_HASH, label: 'Safe hash' },
		]

		signingChecks.forEach(({ key, label }) => {
			if (messageSigningLegibility[key]) {
				details.messageSigning.supported.push(label)
			} else {
				details.messageSigning.missing.push(label)
			}
		})
	}

	return details
}

function generateSoftwareDetailsMarkdown(features: SoftwareFeatureDetails): string {
	const sections: string[] = []

	// Calldata Display section
	if (
		features.calldataDisplay.supported.length > 0 ||
		features.calldataDisplay.missing.length > 0
	) {
		sections.push('**Calldata Display**\n')

		if (features.calldataDisplay.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.calldataDisplay.supported)}\n`)
		}

		if (features.calldataDisplay.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.calldataDisplay.missing)}\n`)
		}
	}

	// Transaction Details section
	if (
		features.transactionDetails.supported.length > 0 ||
		features.transactionDetails.missing.length > 0
	) {
		sections.push('\n**Transaction Details Displayed**\n')

		if (features.transactionDetails.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.transactionDetails.supported)}\n`)
		}

		if (features.transactionDetails.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.transactionDetails.missing)}\n`)
		}
	}

	// Message Signing section
	if (features.messageSigning.supported.length > 0 || features.messageSigning.missing.length > 0) {
		sections.push('\n**Message Signing**\n')

		if (features.messageSigning.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.messageSigning.supported)}\n`)
		}

		if (features.messageSigning.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.messageSigning.missing)}\n`)
		}
	}

	return sections.join('\n')
}

function generateSoftwareHowToImprove(features: SoftwareFeatureDetails): string {
	const improvements: string[] = []

	if (features.calldataDisplay.missing.length > 0) {
		improvements.push(
			`**Calldata Display:** Implement ${commaListFormat(features.calldataDisplay.missing)} for calldata`,
		)
	}

	if (features.transactionDetails.missing.length > 0) {
		improvements.push(
			`**Transaction Details:** Display ${commaListFormat(features.transactionDetails.missing)} in the wallet interface`,
		)
	}

	if (features.messageSigning.missing.length > 0) {
		improvements.push(
			`**Message Signing:** Add support for displaying ${commaListFormat(features.messageSigning.missing)}`,
		)
	}

	if (improvements.length === 0) {
		return 'No improvements needed - the wallet implements full transaction legibility.'
	}

	return improvements.join('\n\n')
}

// Software wallet evaluation helpers
function softwareNoTransactionLegibility(
	calldataDisplay: SoftwareTransactionLegibilityImplementation['calldataDisplay'],
	transactionDetailsDisplay: SoftwareTransactionLegibilityImplementation['transactionDetailsDisplay'],
	messageSigningLegibility: SoftwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeSoftwareFeatures(
		calldataDisplay,
		transactionDetailsDisplay,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)
	const improvementsMarkdown = generateSoftwareHowToImprove(features)

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
		details: markdown(
			`{{WALLET_NAME}} implements either zero or very little transaction legibility. The wallet does not adequately display calldata in multiple formats (raw hex, formatted, copyable) or essential transaction details (gas, nonce, from, to, chain, value). Transaction legibility is important for security as it allows users to verify transaction details on their wallet screen before signing.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	}
}

function softwarePartialTransactionLegibility(
	calldataDisplay: SoftwareTransactionLegibilityImplementation['calldataDisplay'],
	transactionDetailsDisplay: SoftwareTransactionLegibilityImplementation['transactionDetailsDisplay'],
	messageSigningLegibility: SoftwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeSoftwareFeatures(
		calldataDisplay,
		transactionDetailsDisplay,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)
	const improvementsMarkdown = generateSoftwareHowToImprove(features)

	return {
		value: {
			id: 'software_partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports partial transaction legibility.'),
			__brand: brand,
		},
		details: markdown(
			`{{WALLET_NAME}} supports some transaction legibility features, but not all. The wallet may display some calldata formats or some transaction details, but lacks comprehensive support for all calldata display methods (raw hex, formatted, copyable) or all essential transaction details (gas, nonce, from, to, chain, value). Showing transaction details is crucial for security as it allows users to verify transaction details before signing.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	}
}

function softwareFullTransactionLegibility(
	calldataDisplay: SoftwareTransactionLegibilityImplementation['calldataDisplay'],
	transactionDetailsDisplay: SoftwareTransactionLegibilityImplementation['transactionDetailsDisplay'],
	messageSigningLegibility: SoftwareTransactionLegibilityImplementation['messageSigningLegibility'],
): Evaluation<TransactionLegibilityValue> {
	const features = analyzeSoftwareFeatures(
		calldataDisplay,
		transactionDetailsDisplay,
		messageSigningLegibility,
	)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)

	return {
		value: {
			id: 'software_full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports full transaction legibility.'),
			__brand: brand,
		},
		details: markdown(
			`{{WALLET_NAME}} implements full transaction legibility. The wallet supports comprehensive calldata display (raw hex format, formatted output, and copy to clipboard) and displays all essential transaction details clearly on the wallet screen/window for verification before signing, providing maximum security and transparency for users.\n\n${featureDetailsMarkdown}`,
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
	const messageSigningLegibility = hardwareTransactionLegibility.messageSigningLegibility

	const getOverallRating = (): Rating => {
		if (legibility === null || detailsDisplayed === null || dataExtraction === null) {
			return Rating.UNRATED
		}

		// Evaluate message signing (PASS/FAIL only)
		const messageSigningPasses =
			messageSigningLegibility && evaluateHardwareMessageSigning(messageSigningLegibility)

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

		// PASS: Full support - complex decoding AND all details displayed AND advanced data extraction AND message signing passes
		if (
			supportsComplexDecoding &&
			displaysAllDetails &&
			hasAdvancedDataExtraction &&
			messageSigningPasses
		) {
			return Rating.PASS
		}

		// FAIL: (No decoding support AND missing essential details AND no data extraction) OR message signing fails
		if (
			(!supportsAnyCalldataDecoding(legibility) && !displaysAllDetails && !hasDataExtraction) ||
			(messageSigningLegibility !== null && !messageSigningPasses)
		) {
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
			return hardwareNoTransactionLegibility(
				legibility,
				detailsDisplayed,
				dataExtraction,
				messageSigningLegibility,
			)
		} else if (overallRating === Rating.PASS) {
			return hardwareFullTransactionLegibility(
				legibility,
				detailsDisplayed,
				dataExtraction,
				messageSigningLegibility,
			)
		} else {
			const hasDecodingSupport = legibility !== null && supportsAnyCalldataDecoding(legibility)
			const hasAllDetails = detailsDisplayed !== null && isFullTransactionDetails(detailsDisplayed)

			if (hasDecodingSupport && !hasAllDetails) {
				return hardwarePartialTransactionLegibility(
					legibility,
					detailsDisplayed,
					dataExtraction,
					messageSigningLegibility,
				)
			} else {
				return hardwareBasicTransactionLegibility(
					legibility,
					detailsDisplayed,
					dataExtraction,
					messageSigningLegibility,
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

function evaluateSoftwareWalletTransactionLegibility(
	softwareTransactionLegibility: SoftwareTransactionLegibilityImplementation,
): Evaluation<TransactionLegibilityValue> {
	const { withoutRefs: transactionLegibilitySupport } = popRefs(softwareTransactionLegibility)

	const calldataDisplay = transactionLegibilitySupport.calldataDisplay
	const transactionDetailsDisplay = transactionLegibilitySupport.transactionDetailsDisplay
	const messageSigningLegibility = transactionLegibilitySupport.messageSigningLegibility

	if (calldataDisplay === null || transactionDetailsDisplay === null) {
		return unrated(transactionLegibility, brand, null)
	}

	// Evaluate message signing (PASS/FAIL only)
	const messageSigningPasses = evaluateSoftwareMessageSigning(messageSigningLegibility)

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
	// 4. Message signing fails, FAIL
	// 5. If calldata is not copyable OR not formatted, PARTIAL
	// 6. If more than 3 types of transaction details are shown but not all of them, PARTIAL
	// 7. Otherwise, PASS (requires message signing to pass)
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
	} else if (messageSigningLegibility !== null && !messageSigningPasses) {
		// Message signing data provided but fails criteria
		rating = Rating.FAIL
	} else if (!calldataCopyable || !calldataFormatted) {
		// Calldata is not copyable OR not formatted
		rating = Rating.PARTIAL
	} else if (transactionDetailsCount >= 3 && !allTransactionDetailsShown) {
		// More than 3 types of transaction details are shown but not all of them
		rating = Rating.PARTIAL
	} else if (!messageSigningPasses) {
		rating = Rating.PARTIAL
	} else {
		rating = Rating.PASS
	}

	const references = refs(softwareTransactionLegibility)

	const result = ((): Evaluation<TransactionLegibilityValue> => {
		if (rating === Rating.FAIL) {
			return softwareNoTransactionLegibility(
				calldataDisplay,
				transactionDetailsDisplay,
				messageSigningLegibility,
			)
		} else if (rating === Rating.PASS) {
			return softwareFullTransactionLegibility(
				calldataDisplay,
				transactionDetailsDisplay,
				messageSigningLegibility,
			)
		} else {
			return softwarePartialTransactionLegibility(
				calldataDisplay,
				transactionDetailsDisplay,
				messageSigningLegibility,
			)
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
				hardwareFullTransactionLegibility(null, null, null, null),
			),
			exampleRating(
				paragraph(`
					The software wallet implements full transaction legibility, displaying all
					transaction details on the wallet screen/window for verification before signing.
				`),
				softwareFullTransactionLegibility(null, null, null),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
					The hardware wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the hardware device screen.
				`),
				hardwarePartialTransactionLegibility(null, null, null, null),
			),
			exampleRating(
				paragraph(`
					The hardware wallet implements basic transaction legibility, but the implementation is limited
					and doesn't provide full transparency for all transaction details on the device.
				`),
				hardwareBasicTransactionLegibility(null, null, null, null),
			),
			exampleRating(
				paragraph(`
					The software wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the wallet screen/window.
				`),
				softwarePartialTransactionLegibility(null, null, null),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The hardware wallet does not implement effective transaction legibility on the device itself.
				`),
				hardwareNoTransactionLegibility(null, null, null, null),
			),
			exampleRating(
				paragraph(`
					The software wallet does not implement effective transaction legibility.
				`),
				softwareNoTransactionLegibility(null, null, null),
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
