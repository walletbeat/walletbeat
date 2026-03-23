import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import {
	BasicBenchmarkTransactions,
	benchmarkTransactionLabel,
	benchmarkTransactions,
	ComplexBenchmarkTransactions,
	DataDecoded,
	DataDisplayOptions,
	DataExtraction,
	type HardwareMessageSigningLegibility,
	type HardwareTransactionLegibilityImplementation,
	isFullBasicTransactionDetails,
	isHardwareTransactionLegibility,
	isSupportedOnDevice,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	type SoftwareMessageSigningLegibility,
	type SoftwareTransactionLegibilityImplementation,
	supportsAnyCalldataDecoding,
	supportsAnyDataExtraction,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import { refNotNecessary } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { pickWorstRating, unrated } from '../common'

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

	const hasEip712Struct =
		messageSigningLegibility[MessageSigningDetails.EIP712_STRUCT] ===
			DataDisplayOptions.SHOWN_BY_DEFAULT ||
		messageSigningLegibility[MessageSigningDetails.EIP712_STRUCT] ===
			DataDisplayOptions.SHOWN_OPTIONALLY
	const hasDomainHash =
		messageSigningLegibility[MessageSigningDetails.DOMAIN_HASH] ===
			DataDisplayOptions.SHOWN_BY_DEFAULT ||
		messageSigningLegibility[MessageSigningDetails.DOMAIN_HASH] ===
			DataDisplayOptions.SHOWN_OPTIONALLY
	const hasMessageHash =
		messageSigningLegibility[MessageSigningDetails.MESSAGE_HASH] ===
			DataDisplayOptions.SHOWN_BY_DEFAULT ||
		messageSigningLegibility[MessageSigningDetails.MESSAGE_HASH] ===
			DataDisplayOptions.SHOWN_OPTIONALLY
	const hasSafeHash =
		messageSigningLegibility[MessageSigningDetails.SAFE_HASH] ===
			DataDisplayOptions.SHOWN_BY_DEFAULT ||
		messageSigningLegibility[MessageSigningDetails.SAFE_HASH] ===
			DataDisplayOptions.SHOWN_OPTIONALLY

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

	const provides = messageSigningLegibility.messageSigningDetails
	const hasEip712Struct =
		provides[MessageSigningDetails.EIP712_STRUCT] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		provides[MessageSigningDetails.EIP712_STRUCT] === DataDisplayOptions.SHOWN_OPTIONALLY
	const hasDomainHash =
		provides[MessageSigningDetails.DOMAIN_HASH] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		provides[MessageSigningDetails.DOMAIN_HASH] === DataDisplayOptions.SHOWN_OPTIONALLY
	const hasMessageHash =
		provides[MessageSigningDetails.MESSAGE_HASH] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		provides[MessageSigningDetails.MESSAGE_HASH] === DataDisplayOptions.SHOWN_OPTIONALLY
	const hasSafeHash =
		provides[MessageSigningDetails.SAFE_HASH] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		provides[MessageSigningDetails.SAFE_HASH] === DataDisplayOptions.SHOWN_OPTIONALLY

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

function analyzeHardwareFeatures({
	calldataDecoded,
	detailsDisplayed,
	dataExtraction,
	messageSigningLegibility,
}: HardwareTransactionLegibilityImplementation): HardwareFeatureDetails {
	const details: HardwareFeatureDetails = {
		calldataDecoding: { supported: [], missing: [], decodedLocation: null },
		transactionDetails: { supported: [], missing: [] },
		dataExtraction: { supported: [], missing: [] },
		messageSigning: { supported: [], missing: [], decodedLocation: null },
	}

	// Analyze calldata decoding
	if (calldataDecoded !== null) {
		const decodingChecks = benchmarkTransactions.items

		// Track decoded location for calldata decoding
		// If any supported decoding is ON_DEVICE, show ON_DEVICE; otherwise show OFF_DEVICE if any are supported
		let calldataDecodedLocation: DataDecoded | null = null
		let hasOnDeviceDecoding = false
		let hasOffDeviceDecoding = false

		decodingChecks.forEach(key => {
			const label = benchmarkTransactionLabel(key)
			const decodedLocation = calldataDecoded[key]

			if (decodedLocation !== DataDecoded.NOT_DECODED) {
				if (decodedLocation === DataDecoded.ON_DEVICE) {
					hasOnDeviceDecoding = true
				} else {
					hasOffDeviceDecoding = true
				}

				if (isSupportedOnDevice(calldataDecoded, key)) {
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
			if (value === DataDisplayOptions.SHOWN_BY_DEFAULT) {
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
		const provides = messageSigningLegibility.messageSigningDetails
		const decodedLocation = messageSigningLegibility.decoded
		const onDevice = decodedLocation === DataDecoded.ON_DEVICE

		details.messageSigning.decodedLocation = decodedLocation

		const signingChecks = [
			{ key: MessageSigningDetails.EIP712_STRUCT, label: 'EIP-712 structured data' },
			{ key: MessageSigningDetails.DOMAIN_HASH, label: 'Domain hash' },
			{ key: MessageSigningDetails.MESSAGE_HASH, label: 'Message hash' },
			{ key: MessageSigningDetails.SAFE_HASH, label: 'Safe hash' },
		]

		if (onDevice) {
			signingChecks.forEach(({ key, label }) => {
				if (
					provides[key] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
					provides[key] === DataDisplayOptions.SHOWN_OPTIONALLY
				) {
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
		if (features.calldataDecoding.missing.length > 4) {
			improvements.push(
				`**Calldata Decoding:** Add on-device support for:\n${features.calldataDecoding.missing.map(t => `- ${t}`).join('\n')}`,
			)
		} else {
			improvements.push(
				`**Calldata Decoding:** Add on-device support for ${commaListFormat(features.calldataDecoding.missing)}`,
			)
		}
	}

	if (features.calldataDecoding.decodedLocation === DataDecoded.OFF_DEVICE) {
		improvements.push(
			"**Calldata Decoding:** Move decoding on-device so users don't have to trust a potentially compromised companion app.",
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
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeHardwareFeatures(support)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

	return ctx.build({
		outcome: {
			id: 'hardware_no_transaction_legibility',
			rating: Rating.FAIL,
			displayName: 'Unclear transaction details',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not display clear transaction details on the hardware device when signing.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} implements either zero or very little transaction legibility on the hardware device itself. Transaction legibility is important for security as it allows users to verify transaction details directly on their hardware wallet screen before signing, without relying on potentially compromised software.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements to provide comprehensive transaction legibility on the hardware device:\n\n${improvementsMarkdown}`,
		),
	})
}

function hardwareBasicTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeHardwareFeatures(support)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

	return ctx.build({
		outcome: {
			id: 'hardware_basic_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Basic transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports basic transaction legibility on the hardware device.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} supports basic transaction legibility on the hardware device, but the implementation does not provide full transparency. The device may display some transaction details or support basic calldata decoding, but lacks comprehensive support for complex transactions, all essential details, or advanced data extraction methods.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	})
}

function hardwarePartialTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeHardwareFeatures(support)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)
	const improvementsMarkdown = generateHardwareHowToImprove(features)

	return ctx.build({
		outcome: {
			id: 'hardware_partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports partial transaction legibility on the hardware device.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} supports partial transaction legibility on the hardware device. The device displays most transaction details and may support calldata decoding for some transaction types, but may not fully decode complex nested transactions or provide all data extraction methods. Showing transaction details directly on the hardware device is crucial for security as it allows users to verify transaction details independently of potentially compromised software.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	})
}

function hardwareFullTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeHardwareFeatures(support)
	const featureDetailsMarkdown = generateHardwareDetailsMarkdown(features)

	return ctx.build({
		outcome: {
			id: 'hardware_full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports full transaction legibility on the hardware device.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} implements full transaction legibility on the hardware device itself. All transaction details are clearly displayed on the device screen, the device supports decoding of complex nested transactions, and provides comprehensive data extraction methods (QR codes, hashes) for independent verification before signing, providing maximum security and transparency for users.\n\n${featureDetailsMarkdown}`,
		),
	})
}

// Software wallet detail generation helpers
interface SoftwareFeatureDetails {
	calldataDisplay: {
		supported: string[]
		missing: string[]
	}
	transactions: {
		passing: string[]
		partial: string[]
		failing: string[]
	}
	messageSigning: {
		supported: string[]
		missing: string[]
	}
}

function analyzeSoftwareFeatures({
	calldataDisplay,
	transactionDetailsDisplay,
	messageSigningLegibility,
}: SoftwareTransactionLegibilityImplementation): SoftwareFeatureDetails {
	const details: SoftwareFeatureDetails = {
		calldataDisplay: { supported: [], missing: [] },
		transactions: { passing: [], partial: [], failing: [] },
		messageSigning: { supported: [], missing: [] },
	}

	// Analyze calldata display
	if (calldataDisplay !== null) {
		if (calldataDisplay.rawHex) {
			details.calldataDisplay.supported.push('Raw hex display')
		} else {
			details.calldataDisplay.missing.push('Raw hex display')
		}

		if (calldataDisplay.formatted) {
			details.calldataDisplay.supported.push('Formatted output')
		} else {
			details.calldataDisplay.missing.push('Formatted output')
		}

		if (calldataDisplay.copyHexToClipboard) {
			details.calldataDisplay.supported.push('Copy to clipboard')
		} else {
			details.calldataDisplay.missing.push('Copy to clipboard')
		}
	}

	// Analyze per-transaction benchmark details
	if (transactionDetailsDisplay !== null) {
		const isShown = (field: DataDisplayOptions): boolean =>
			field === DataDisplayOptions.SHOWN_BY_DEFAULT || field === DataDisplayOptions.SHOWN_OPTIONALLY

		type BasicFields = {
			gas: DataDisplayOptions
			nonce: DataDisplayOptions
			from: DataDisplayOptions
			to: DataDisplayOptions
			chain: DataDisplayOptions
			value: DataDisplayOptions
		}

		const missingBasicFields = (tx: BasicFields): string[] => {
			const missing: string[] = []

			if (!isShown(tx.gas)) {
				missing.push('gas')
			}

			if (!isShown(tx.nonce)) {
				missing.push('nonce')
			}

			if (!isShown(tx.from)) {
				missing.push('from')
			}

			if (!isShown(tx.to)) {
				missing.push('to')
			}

			if (!isShown(tx.chain)) {
				missing.push('chain')
			}

			if (!isShown(tx.value)) {
				missing.push('value')
			}

			return missing
		}

		// ETH transfer
		{
			const tx = transactionDetailsDisplay[BasicBenchmarkTransactions.ETH_TRANSFER]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(`ETH transfer (missing: ${commaListFormat(missing)})`)
			} else {
				details.transactions.passing.push('ETH transfer')
			}
		}

		// ERC-20 token transfer
		{
			const tx = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_20_TRANSFER]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`ERC-20 token transfer (missing: ${commaListFormat(missing)})`,
				)
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('ERC-20 token transfer (outcome not explained)')
			} else {
				details.transactions.passing.push('ERC-20 token transfer')
			}
		}

		// ERC-721 NFT transfer
		{
			const tx = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_721_TRANSFER]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`ERC-721 NFT transfer (missing: ${commaListFormat(missing)})`,
				)
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('ERC-721 NFT transfer (outcome not explained)')
			} else {
				details.transactions.passing.push('ERC-721 NFT transfer')
			}
		}

		// ERC-1155 token transfer
		{
			const tx = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_1155_TRANSFER]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`ERC-1155 token transfer (missing: ${commaListFormat(missing)})`,
				)
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('ERC-1155 token transfer (outcome not explained)')
			} else {
				details.transactions.passing.push('ERC-1155 token transfer')
			}
		}

		// ZKSync USDC transfer
		{
			const tx = transactionDetailsDisplay[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`ZKSync USDC transfer (missing: ${commaListFormat(missing)})`,
				)
			} else {
				details.transactions.passing.push('ZKSync USDC transfer')
			}
		}

		// USDC approval (requires calldataDecoded to reach PARTIAL)
		{
			const tx = transactionDetailsDisplay[ComplexBenchmarkTransactions.USDC_APPROVAL]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(`USDC approval (missing: ${commaListFormat(missing)})`)
			} else if (!isShown(tx.calldataDecoded)) {
				details.transactions.failing.push('USDC approval (calldata not decoded)')
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('USDC approval (outcome not explained)')
			} else {
				details.transactions.passing.push('USDC approval')
			}
		}

		// Aave supply (requires calldataDecoded to reach PARTIAL)
		{
			const tx = transactionDetailsDisplay[ComplexBenchmarkTransactions.AAVE_SUPPLY]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(`Aave supply (missing: ${commaListFormat(missing)})`)
			} else if (!isShown(tx.calldataDecoded)) {
				details.transactions.failing.push('Aave supply (calldata not decoded)')
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('Aave supply (outcome not explained)')
			} else {
				details.transactions.passing.push('Aave supply')
			}
		}

		// Safe nested Aave supply (requires calldataDecoded and explained outcome to PASS)
		{
			const tx =
				transactionDetailsDisplay[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`Safe nested Aave supply (missing: ${commaListFormat(missing)})`,
				)
			} else if (!isShown(tx.calldataDecoded)) {
				details.transactions.partial.push('Safe nested Aave supply (calldata not decoded)')
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('Safe nested Aave supply (outcome not explained)')
			} else {
				details.transactions.passing.push('Safe nested Aave supply')
			}
		}

		// Safe nested multisend (hardest benchmark — requires calldataDecoded and explained outcome to PASS)
		{
			const tx =
				transactionDetailsDisplay[
					ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`Safe nested multisend (missing: ${commaListFormat(missing)})`,
				)
			} else if (!isShown(tx.calldataDecoded)) {
				details.transactions.partial.push('Safe nested multisend (calldata not decoded)')
			} else if (tx.transactionOutcome !== TransactionOutcome.EXPLAINED) {
				details.transactions.partial.push('Safe nested multisend (outcome not explained)')
			} else {
				details.transactions.passing.push('Safe nested multisend')
			}
		}

		// Failed transaction simulation
		{
			const tx = transactionDetailsDisplay[SimulationBenchmarkTransactions.FAILED_TRANSACTION]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`Failed transaction simulation (missing: ${commaListFormat(missing)})`,
				)
			} else if (tx.failure !== 'DETECTED') {
				details.transactions.partial.push('Failed transaction simulation (failure not detected)')
			} else {
				details.transactions.passing.push('Failed transaction simulation')
			}
		}

		// Nondeterministic transaction simulation
		{
			const tx =
				transactionDetailsDisplay[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]
			const missing = missingBasicFields(tx)

			if (missing.length > 0) {
				details.transactions.failing.push(
					`Nondeterministic transaction simulation (missing: ${commaListFormat(missing)})`,
				)
			} else if (tx.nondeterminism === 'NO_OUTCOME_SHOWN') {
				details.transactions.partial.push(
					'Nondeterministic transaction simulation (no outcome shown)',
				)
			} else if (tx.nondeterminism === 'STATIC_SINGLE_OUTCOME') {
				details.transactions.partial.push(
					'Nondeterministic transaction simulation (nondeterminism not detected)',
				)
			} else if (tx.nondeterminism === 'RESIMULATES_NO_WARNING') {
				details.transactions.partial.push(
					'Nondeterministic transaction simulation (detected but no warning shown)',
				)
			} else {
				details.transactions.passing.push('Nondeterministic transaction simulation')
			}
		}
	}

	// Analyze message signing
	if (messageSigningLegibility !== null) {
		const signingChecks = [
			{ key: MessageSigningDetails.EIP712_STRUCT, label: 'EIP-712 structured data' },
			{ key: MessageSigningDetails.DOMAIN_HASH, label: 'Domain hash' },
			{ key: MessageSigningDetails.MESSAGE_HASH, label: 'Message hash' },
			{ key: MessageSigningDetails.SAFE_HASH, label: 'Safe hash' },
		]

		signingChecks.forEach(({ key, label }) => {
			if (
				messageSigningLegibility[key] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
				messageSigningLegibility[key] === DataDisplayOptions.SHOWN_OPTIONALLY
			) {
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

	// Transaction Benchmarks section
	const hasTransactionData =
		features.transactions.passing.length > 0 ||
		features.transactions.partial.length > 0 ||
		features.transactions.failing.length > 0

	if (hasTransactionData) {
		sections.push('\n**Transaction Benchmarks**\n')

		if (features.transactions.passing.length > 0) {
			sections.push(`✓ Passing: ${commaListFormat(features.transactions.passing)}\n`)
		}

		if (features.transactions.partial.length > 0) {
			if (features.transactions.partial.length > 4) {
				sections.push(
					`⚠ Partial:\n${features.transactions.partial.map(t => `- ${t}`).join('\n')}\n`,
				)
			} else {
				sections.push(`⚠ Partial: ${commaListFormat(features.transactions.partial)}\n`)
			}
		}

		if (features.transactions.failing.length > 0) {
			if (features.transactions.failing.length > 4) {
				sections.push(
					`✗ Failing:\n${features.transactions.failing.map(t => `- ${t}`).join('\n')}\n`,
				)
			} else {
				sections.push(`✗ Failing: ${commaListFormat(features.transactions.failing)}\n`)
			}
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

	if (features.transactions.failing.length > 0) {
		if (features.transactions.failing.length > 4) {
			improvements.push(
				`**Transaction Information:** Add the required fields or calldata decoding for:\n${features.transactions.failing.map(t => `- ${t}`).join('\n')}`,
			)
		} else {
			improvements.push(
				`**Transaction Information:** Add the required fields or calldata decoding for ${commaListFormat(features.transactions.failing)}`,
			)
		}
	}

	if (features.transactions.partial.length > 0) {
		improvements.push(`**Transaction Clarity:** ${commaListFormat(features.transactions.partial)}`)
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
	ctx: EvaluationContext,
	support: SoftwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeSoftwareFeatures(support)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)
	const improvementsMarkdown = generateSoftwareHowToImprove(features)

	return ctx.build({
		outcome: {
			id: 'software_no_transaction_legibility',
			rating: Rating.FAIL,
			displayName: 'Unclear transaction details',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not display clear transaction details when signing.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} implements either zero or very little transaction legibility. The wallet does not adequately display calldata (raw hex, formatted, copyable) or essential transaction details for all benchmark transaction types. Transaction legibility is important for security as it allows users to verify transaction details on their wallet screen before signing.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	})
}

function softwarePartialTransactionLegibility(
	ctx: EvaluationContext,
	support: SoftwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeSoftwareFeatures(support)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)
	const improvementsMarkdown = generateSoftwareHowToImprove(features)

	return ctx.build({
		outcome: {
			id: 'software_partial_transaction_legibility',
			rating: Rating.PARTIAL,
			displayName: 'Partial transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports partial transaction legibility.'),
		},
		details: markdown(
			`{{WALLET_NAME}} supports some transaction legibility features, but not all. The wallet displays basic transaction details but may be missing calldata display formats, clear transaction outcome explanations for complex interactions, or simulation capabilities. Showing full transaction details is crucial for security.\n\n${featureDetailsMarkdown}`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
		),
	})
}

function softwareFullTransactionLegibility(
	ctx: EvaluationContext,
	support: SoftwareTransactionLegibilityImplementation,
): Evaluation {
	const features = analyzeSoftwareFeatures(support)
	const featureDetailsMarkdown = generateSoftwareDetailsMarkdown(features)

	return ctx.build({
		outcome: {
			id: 'software_full_transaction_legibility',
			rating: Rating.PASS,
			displayName: 'Full transaction legibility support',
			shortExplanation: sentence('{{WALLET_NAME}} supports full transaction legibility.'),
		},
		details: markdown(
			`{{WALLET_NAME}} implements full transaction legibility. The wallet displays calldata in all formats (raw hex, formatted, copyable), clearly explains the outcome of all benchmark transaction types including complex nested transactions, and detects failed and nondeterministic transactions, providing maximum security and transparency for users.\n\n${featureDetailsMarkdown}`,
		),
	})
}

function evaluateHardwareWalletTransactionLegibility(
	ctx: EvaluationContext,
	hardwareTransactionLegibility: HardwareTransactionLegibilityImplementation,
): Evaluation {
	ctx.addRef(hardwareTransactionLegibility)

	const { calldataDecoded, detailsDisplayed, dataExtraction, messageSigningLegibility } =
		hardwareTransactionLegibility

	const getOverallRating = (): Rating => {
		if (calldataDecoded === null || detailsDisplayed === null || dataExtraction === null) {
			return Rating.UNRATED
		}

		// Evaluate message signing (PASS/FAIL only)
		const messageSigningPasses =
			messageSigningLegibility && evaluateHardwareMessageSigning(messageSigningLegibility)

		// Check if wallet supports calldata decoding for complex transactions (ON_DEVICE)
		const supportsComplexDecoding: boolean =
			supportsAnyCalldataDecoding(calldataDecoded) &&
			(isSupportedOnDevice(
				calldataDecoded,
				ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND,
			) ||
				isSupportedOnDevice(
					calldataDecoded,
					ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED,
				))

		// Check if wallet supports basic calldata decoding (ON_DEVICE)
		const supportsBasicDecoding: boolean =
			isSupportedOnDevice(calldataDecoded, BasicBenchmarkTransactions.ERC_20_TRANSFER) &&
			isSupportedOnDevice(calldataDecoded, BasicBenchmarkTransactions.ERC_721_TRANSFER) &&
			isSupportedOnDevice(calldataDecoded, BasicBenchmarkTransactions.ERC_1155_TRANSFER) &&
			isSupportedOnDevice(calldataDecoded, BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER) &&
			isSupportedOnDevice(calldataDecoded, ComplexBenchmarkTransactions.AAVE_SUPPLY)

		// Check if all transaction details are displayed
		const displaysAllDetails: boolean = isFullBasicTransactionDetails(detailsDisplayed)

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
			(!supportsAnyCalldataDecoding(calldataDecoded) &&
				!displaysAllDetails &&
				!hasDataExtraction) ||
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
			(supportsAnyCalldataDecoding(calldataDecoded) && !displaysAllDetails)
		) {
			return Rating.PARTIAL
		}

		// Default to PARTIAL if we have any support
		return Rating.PARTIAL
	}

	const overallRating = getOverallRating()

	if (overallRating === Rating.UNRATED) {
		return unrated(ctx, null)
	}

	if (overallRating === Rating.FAIL) {
		return hardwareNoTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	if (overallRating === Rating.PASS) {
		return hardwareFullTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	const hasDecodingSupport =
		calldataDecoded !== null && supportsAnyCalldataDecoding(calldataDecoded)
	const hasAllDetails = detailsDisplayed !== null && isFullBasicTransactionDetails(detailsDisplayed)

	if (hasDecodingSupport && !hasAllDetails) {
		return hardwarePartialTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	return hardwareBasicTransactionLegibility(ctx, hardwareTransactionLegibility)
}

function evaluateSoftwareWalletTransactionLegibility(
	ctx: EvaluationContext,
	softwareTransactionLegibility: SoftwareTransactionLegibilityImplementation,
): Evaluation {
	const transactionLegibilitySupport = ctx.popRefs(softwareTransactionLegibility)

	const { calldataDisplay, transactionDetailsDisplay, messageSigningLegibility } =
		transactionLegibilitySupport

	if (calldataDisplay === null || transactionDetailsDisplay === null) {
		return unrated(ctx, null)
	}

	const isShown = (field: DataDisplayOptions): boolean =>
		field === DataDisplayOptions.SHOWN_BY_DEFAULT || field === DataDisplayOptions.SHOWN_OPTIONALLY

	const allBasicFieldsShown = (tx: {
		gas: DataDisplayOptions
		nonce: DataDisplayOptions
		from: DataDisplayOptions
		to: DataDisplayOptions
		chain: DataDisplayOptions
		value: DataDisplayOptions
	}): boolean =>
		isShown(tx.gas) &&
		isShown(tx.nonce) &&
		isShown(tx.from) &&
		isShown(tx.to) &&
		isShown(tx.chain) &&
		isShown(tx.value)

	const usdcApproval = transactionDetailsDisplay[ComplexBenchmarkTransactions.USDC_APPROVAL]
	const aaveSupply = transactionDetailsDisplay[ComplexBenchmarkTransactions.AAVE_SUPPLY]
	const safeNested =
		transactionDetailsDisplay[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]
	const safeMultisend =
		transactionDetailsDisplay[
			ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
		]
	const erc20 = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_20_TRANSFER]
	const erc721 = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_721_TRANSFER]
	const erc1155 = transactionDetailsDisplay[BasicBenchmarkTransactions.ERC_1155_TRANSFER]
	const failedTx = transactionDetailsDisplay[SimulationBenchmarkTransactions.FAILED_TRANSACTION]
	const nondeterminismTx =
		transactionDetailsDisplay[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]

	// All benchmark transactions require all 6 basic fields to be shown (at least optionally).
	// USDC_APPROVAL and AAVE_SUPPLY additionally require calldataDecoded to be shown.
	// Failing any of these → FAIL.
	const allTransactions = [
		transactionDetailsDisplay[BasicBenchmarkTransactions.ETH_TRANSFER],
		erc20,
		erc721,
		erc1155,
		transactionDetailsDisplay[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER],
		usdcApproval,
		aaveSupply,
		safeNested,
		safeMultisend,
		failedTx,
		nondeterminismTx,
	]

	let rating: Rating

	if (
		!calldataDisplay.rawHex ||
		(messageSigningLegibility !== null &&
			!evaluateSoftwareMessageSigning(messageSigningLegibility)) ||
		allTransactions.some(tx => !allBasicFieldsShown(tx)) ||
		!isShown(usdcApproval.calldataDecoded) ||
		!isShown(aaveSupply.calldataDecoded)
	) {
		rating = Rating.FAIL
	} else {
		// PASS requires: formatted + copyable calldata display, all transaction outcomes explained,
		// complex nested transactions fully decoded, and simulation benchmarks detected.
		const isPartial =
			!calldataDisplay.formatted ||
			!calldataDisplay.copyHexToClipboard ||
			erc20.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			erc721.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			erc1155.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			usdcApproval.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			aaveSupply.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			!isShown(safeNested.calldataDecoded) ||
			safeNested.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			!isShown(safeMultisend.calldataDecoded) ||
			safeMultisend.transactionOutcome !== TransactionOutcome.EXPLAINED ||
			failedTx.failure !== 'DETECTED' ||
			nondeterminismTx.nondeterminism !== 'RESIMULATES_WITH_WARNING' ||
			messageSigningLegibility === null ||
			!evaluateSoftwareMessageSigning(messageSigningLegibility)

		rating = isPartial ? Rating.PARTIAL : Rating.PASS
	}

	ctx.addRef(softwareTransactionLegibility)

	if (rating === Rating.FAIL) {
		return softwareNoTransactionLegibility(ctx, softwareTransactionLegibility)
	}

	if (rating === Rating.PASS) {
		return softwareFullTransactionLegibility(ctx, softwareTransactionLegibility)
	}

	return softwarePartialTransactionLegibility(ctx, softwareTransactionLegibility)
}

export const transactionLegibility: Attribute = {
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
		- Simple transfers (ETH transfers, ERC-20 transfers, ERC-1155, and ERC-721 transfers)
		- Token approvals
		- DeFi interactions
		- Complex nested transactions

		For software wallets, transaction details are evaluated according to the set of information they display:
		- For transfers (ETH transfers, ERC-20 transfers, ERC-721 transfers, ERC-1155 transfers): gas, nonce, sender, recipient, chain, amount. Some details may be collapsed by default (e.g. 'nonce'), but all of them must be accessible through the UI.
		- Non-transfer transactions (approvals, DeFi contract interactions, Safe multisig nested transactions): gas, nonce, from, chain. In addition, the wallet must explain the transaction outcome visually or in plain language; for example, for ERC-20 approvals, it should explain what token is being approved, for which contract, and for how many tokens.
		- If presented with a transaction that will revert if included onchain, the wallet must detect that the transaction would fail and warn the user beforehand.
		- If presented with a transaction for which the behavior would be nondeterministic based on predictably-changing parameters (e.g. block number), the wallet must detect that the transaction has a nondeterministic outcome and warn the user beforehand.

		**Software Wallet Specific Requirements:**
		For software wallets, calldata must be displayed in multiple formats:
		- Raw hex format: Users can view the raw hexadecimal calldata
		- Formatted output: Users can view decoded, human-readable calldata
		- Copy to clipboard: Users can copy the calldata directly for verification

		Software wallets must also support calldata decoding for various transaction types, from basic token transfers to complex nested transactions.

		**Hardware Wallet Specific Requirements:**
		For hardware wallets, the signature/transaction information *must* be visible on the hardware wallet device itself. Any data shown on a software wallet component is ignored for hardware wallet ratings.

		Hardware wallets must also provide data extraction methods to allow users to independently verify transaction data:
		- Visual display: Users can view the data on the hardware wallet screen
		- QR code: Users can scan a QR code displayed on the device to extract data
		- Hashes: Users can compare hashes displayed on the device to verify data

		**Rating Criteria:**

		For software wallets:
		- A wallet receives a passing rating if it displays calldata in all three formats (raw hex, formatted, copyable), displays all essential transaction details, and supports complex calldata decoding (including nested transactions).
		- A wallet receives a partial rating if it has some combination of these features but not all, or if calldata decoding data has not been provided.
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
				hardwareFullTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDecoded: null,
						detailsDisplayed: null,
						dataExtraction: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet implements full transaction legibility, displaying all
					transaction details on the wallet screen/window for verification before signing.
				`),
				softwareFullTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDisplay: null,
						transactionDetailsDisplay: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
					The hardware wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the hardware device screen.
				`),
				hardwarePartialTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDecoded: null,
						detailsDisplayed: null,
						dataExtraction: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The hardware wallet implements basic transaction legibility, but the implementation is limited
					and doesn't provide full transparency for all transaction details on the device.
				`),
				hardwareBasicTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDecoded: null,
						detailsDisplayed: null,
						dataExtraction: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet implements partial transaction legibility, where most but not all transaction
					details are displayed on the wallet screen/window.
				`),
				softwarePartialTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDisplay: null,
						transactionDetailsDisplay: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The hardware wallet does not implement effective transaction legibility on the device itself.
				`),
				hardwareNoTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDecoded: null,
						detailsDisplayed: null,
						dataExtraction: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet does not implement effective transaction legibility.
				`),
				softwareNoTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						calldataDisplay: null,
						transactionDetailsDisplay: null,
						messageSigningLegibility: null,
						ref: refNotNecessary,
					},
				),
			),
		],
	},
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Self-test.

		if (ctx.features.security.transactionLegibility === null) {
			return unrated(ctx, null)
		}

		if (isHardwareTransactionLegibility(ctx.features.security.transactionLegibility)) {
			return evaluateHardwareWalletTransactionLegibility(
				ctx,
				ctx.features.security.transactionLegibility,
			)
		}

		return evaluateSoftwareWalletTransactionLegibility(
			ctx,
			ctx.features.security.transactionLegibility,
		)
	},
	aggregate: pickWorstRating,
}
