import { eip712 } from '@/data/eips/eip-712'
import { erc7730 } from '@/data/eips/erc-7730'
import { erc8213 } from '@/data/eips/erc-8213'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import { eipMarkdownLink, eipMarkdownShortLink } from '@/schema/eips'
import {
	BasicBenchmarkTransactions,
	benchmarkTransactionLabel,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	complexBenchmarkTransactions,
	DataDisplayOptions,
	DataExtraction,
	DataLocation,
	displaysFullTransactionDetails,
	displaysNoTransactionDetails,
	type HardwareTransactionLegibilityImplementation,
	type HardwareWalletErc8213,
	isHardwareTransactionLegibility,
	isShown,
	isTransactionDecoded,
	isTransactionOutcomeExplained,
	MessageSigningDetails,
	noDataExtraction,
	SimulationBenchmarkTransactions,
	type SoftwareTransactionLegibilityImplementation,
	type SoftwareTransactionSimulations,
	type SoftwareWalletErc8213,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { refNotNecessary } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { pickWorstRating, unrated } from '../common'

// Message signing evaluation helpers

/**
 * Evaluates if software wallet message signing meets PASS criteria.
 * PASS requires: EIP-712 digest shown (per ERC-8213).
 */
function evaluateSoftwareMessageSigning(
	msgSigning: NonNullable<SoftwareWalletErc8213['messageSigningLegibility']>,
): boolean {
	return (
		msgSigning[MessageSigningDetails.EIP712_DIGEST] === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		msgSigning[MessageSigningDetails.EIP712_DIGEST] === DataDisplayOptions.SHOWN_OPTIONALLY
	)
}

/**
 * Evaluates if hardware wallet message signing meets PASS criteria.
 * PASS requires: EIP-712 digest shown ON_DEVICE (per ERC-8213).
 */
function evaluateHardwareMessageSigning(
	msgSigning: NonNullable<HardwareWalletErc8213['messageSigningLegibility']>,
): boolean {
	const digestCapability = msgSigning[MessageSigningDetails.EIP712_DIGEST]

	return (
		digestCapability !== undefined &&
		digestCapability.location === DataLocation.ON_DEVICE &&
		(digestCapability.display === DataDisplayOptions.SHOWN_BY_DEFAULT ||
			digestCapability.display === DataDisplayOptions.SHOWN_OPTIONALLY)
	)
}

// Hardware wallet detail generation helpers
interface HardwareFeatureDetails {
	erc7730: {
		supported: string[]
		missing: string[]
		decodedLocation: DataLocation | null
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
		decodedLocation: DataLocation | null
	}
	calldataDigest: DataLocation | null
}

function analyzeHardwareFeatures(
	{ erc7730, detailsDisplayed, dataExtraction }: HardwareTransactionLegibilityImplementation,
	calldataDigestLocation: DataLocation | null,
	messageSigningLegibility: HardwareWalletErc8213['messageSigningLegibility'] | null,
): HardwareFeatureDetails {
	const details: HardwareFeatureDetails = {
		erc7730: { supported: [], missing: [], decodedLocation: null },
		transactionDetails: { supported: [], missing: [] },
		dataExtraction: { supported: [], missing: [] },
		messageSigning: { supported: [], missing: [], decodedLocation: null },
		calldataDigest: calldataDigestLocation,
	}

	if (erc7730 !== null && isSupported(erc7730)) {
		let hasOnDeviceDecoding = false
		let hasOffDeviceDecoding = false

		for (const key of complexBenchmarkTransactions.items) {
			const label = benchmarkTransactionLabel(key)
			const location = erc7730[key]

			if (location === DataLocation.ON_DEVICE) {
				hasOnDeviceDecoding = true
				details.erc7730.supported.push(label)
			} else if (location === DataLocation.OFF_DEVICE) {
				hasOffDeviceDecoding = true
				details.erc7730.missing.push(label)
			} else {
				details.erc7730.missing.push(label)
			}
		}

		if (hasOnDeviceDecoding) {
			details.erc7730.decodedLocation = DataLocation.ON_DEVICE
		} else if (hasOffDeviceDecoding) {
			details.erc7730.decodedLocation = DataLocation.OFF_DEVICE
		}
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
		const provides = messageSigningLegibility

		const signingChecks = [
			{ key: MessageSigningDetails.EIP712_STRUCT, label: 'EIP-712 structured data' },
			{ key: MessageSigningDetails.DOMAIN_HASH, label: 'Domain hash' },
			{ key: MessageSigningDetails.MESSAGE_HASH, label: 'Message hash' },
			{ key: MessageSigningDetails.EIP712_DIGEST, label: 'EIP-712 digest' },
		]

		// Determine if any are on-device
		const allOnDevice = Object.values(provides).every(
			cap => cap.location === DataLocation.ON_DEVICE,
		)

		details.messageSigning.decodedLocation = allOnDevice
			? DataLocation.ON_DEVICE
			: DataLocation.OFF_DEVICE

		signingChecks.forEach(({ key, label }) => {
			const cap = provides[key]

			if (
				cap.location === DataLocation.ON_DEVICE &&
				(cap.display === DataDisplayOptions.SHOWN_BY_DEFAULT ||
					cap.display === DataDisplayOptions.SHOWN_OPTIONALLY)
			) {
				details.messageSigning.supported.push(label)
			} else {
				details.messageSigning.missing.push(label)
			}
		})
	}

	return details
}

function generateHardwareDetailsMarkdown(features: HardwareFeatureDetails): string {
	const sections: string[] = []

	// ERC-7730 Calldata Decoding section
	if (features.erc7730.supported.length > 0 || features.erc7730.missing.length > 0) {
		sections.push('**ERC-7730 Calldata Decoding**\n')

		if (features.erc7730.decodedLocation === DataLocation.ON_DEVICE) {
			sections.push('Decoded on-device.\n')
		} else if (features.erc7730.decodedLocation === DataLocation.OFF_DEVICE) {
			sections.push('Decoded off-device.\n')
		}

		if (features.erc7730.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.erc7730.supported)}\n`)
		}

		if (features.erc7730.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.erc7730.missing)}\n`)
		}
	}

	// Calldata digest section (ERC-8213)
	if (features.calldataDigest !== null) {
		sections.push('\n**Calldata digest (ERC-8213)**\n')

		if (features.calldataDigest === DataLocation.ON_DEVICE) {
			sections.push('✓ Calldata digest displayed on-device.\n')
		} else if (features.calldataDigest === DataLocation.OFF_DEVICE) {
			sections.push('⚠ Calldata digest displayed off-device only.\n')
		} else {
			sections.push('✗ Calldata digest not shown.\n')
		}
	}

	// Message Signing section
	if (features.messageSigning.supported.length > 0 || features.messageSigning.missing.length > 0) {
		sections.push('\n**Message Signing**\n')

		if (features.messageSigning.decodedLocation === DataLocation.ON_DEVICE) {
			sections.push('Displayed on-device.\n')
		} else if (features.messageSigning.decodedLocation === DataLocation.OFF_DEVICE) {
			sections.push('Displayed off-device.\n')
		}

		if (features.messageSigning.supported.length > 0) {
			sections.push(`✓ Supported: ${commaListFormat(features.messageSigning.supported)}\n`)
		}

		if (features.messageSigning.missing.length > 0) {
			sections.push(`✗ Missing: ${commaListFormat(features.messageSigning.missing)}\n`)
		}
	}

	// ERC-8213 compliance summary
	const calldataDigestOnDevice = features.calldataDigest === DataLocation.ON_DEVICE
	const eip712DigestOnDevice = features.messageSigning.supported.includes('EIP-712 digest')
	const erc8213Full = calldataDigestOnDevice && eip712DigestOnDevice
	const erc8213Partial = calldataDigestOnDevice || eip712DigestOnDevice

	sections.push('\n**ERC-8213 Compliance**\n')

	if (erc8213Full) {
		sections.push(
			'✓ Fully implemented on-device: Calldata digest and EIP-712 digest are both shown.\n',
		)
	} else if (erc8213Partial) {
		sections.push(
			`⚠ Partial: ${calldataDigestOnDevice ? '✓ Calldata digest (on-device)' : '✗ Calldata digest'}, ${eip712DigestOnDevice ? '✓ EIP-712 digest (on-device)' : '✗ EIP-712 digest'}.\n`,
		)
	} else {
		sections.push(
			'✗ Not implemented: Neither Calldata digest nor EIP-712 digest is shown on-device.\n',
		)
	}

	return sections.join('\n')
}

function generateHardwareHowToImprove(features: HardwareFeatureDetails): string | undefined {
	const improvements: string[] = []

	if (features.erc7730.missing.length > 0) {
		improvements.push(
			`**ERC-7730 Calldata Decoding:** Add on-device ERC-7730 support for:\n${features.erc7730.missing.map(t => `- ${t}`).join('\n')}`,
		)
	}

	if (features.erc7730.decodedLocation === DataLocation.OFF_DEVICE) {
		improvements.push(
			"**ERC-7730 Calldata Decoding:** Move ERC-7730 decoding on-device so users don't have to trust a potentially compromised companion app.",
		)
	}

	if (features.transactionDetails.missing.length > 0) {
		improvements.push(
			`**Transaction Details:** Display ${commaListFormat(features.transactionDetails.missing)} on the device`,
		)
	}

	if (features.messageSigning.decodedLocation === DataLocation.OFF_DEVICE) {
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

	const erc8213Missing: string[] = []

	if (features.calldataDigest !== DataLocation.ON_DEVICE) {
		erc8213Missing.push(
			features.calldataDigest === DataLocation.OFF_DEVICE
				? '**Calldata digest:** Move on-device, the digest must appear on the hardware screen, not only in companion software.'
				: '**Calldata digest:** Show `keccak256(len(calldata) || calldata)` on the device screen so users can independently verify the calldata.',
		)
	}

	if (!features.messageSigning.supported.includes('EIP-712 digest')) {
		erc8213Missing.push(
			'**EIP-712 digest:** Show the final `"\\x19\\x01" || domainSeparator || hashStruct(message)` hash on the device screen during typed message signing.',
		)
	}

	if (erc8213Missing.length > 0) {
		improvements.push(
			`**ERC-8213 Implementation:** Implement the following on-device to fully comply with ERC-8213:\n${erc8213Missing.map(m => `- ${m}`).join('\n')}`,
		)
	}

	if (improvements.length === 0) {
		return undefined
	}

	return improvements.join('\n\n')
}

// Hardware wallet evaluation helpers
function unwrapHardwareErc8213(support: HardwareTransactionLegibilityImplementation): {
	calldataDigestLocation: DataLocation | null
	messageSigningLegibility: HardwareWalletErc8213['messageSigningLegibility'] | null
} {
	const erc8213Data =
		support.erc8213 !== null && isSupported(support.erc8213) ? support.erc8213 : null
	let calldataDigestLocation: DataLocation | null = null

	if (erc8213Data !== null && erc8213Data.calldataDisplay !== null) {
		calldataDigestLocation = erc8213Data.calldataDisplay[CallDataDisplay.CALLDATA_DIGEST].location
	}

	const messageSigningLegibility =
		erc8213Data !== null ? erc8213Data.messageSigningLegibility : null

	return { calldataDigestLocation, messageSigningLegibility }
}

function hardwareNoTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const { calldataDigestLocation, messageSigningLegibility } = unwrapHardwareErc8213(support)
	const features = analyzeHardwareFeatures(
		support,
		calldataDigestLocation,
		messageSigningLegibility,
	)
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
		howToImprove:
			improvementsMarkdown === undefined
				? undefined
				: markdown(
						`{{WALLET_NAME}} should implement the following improvements to provide comprehensive transaction legibility on the hardware device:\n\n${improvementsMarkdown}`,
					),
	})
}

function hardwareBasicTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const { calldataDigestLocation, messageSigningLegibility } = unwrapHardwareErc8213(support)
	const features = analyzeHardwareFeatures(
		support,
		calldataDigestLocation,
		messageSigningLegibility,
	)
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
		howToImprove:
			improvementsMarkdown === undefined
				? undefined
				: markdown(
						`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
					),
	})
}

function hardwarePartialTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const { calldataDigestLocation, messageSigningLegibility } = unwrapHardwareErc8213(support)
	const features = analyzeHardwareFeatures(
		support,
		calldataDigestLocation,
		messageSigningLegibility,
	)
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
		howToImprove:
			improvementsMarkdown === undefined
				? undefined
				: markdown(
						`{{WALLET_NAME}} should implement the following improvements:\n\n${improvementsMarkdown}`,
					),
	})
}

function hardwareFullTransactionLegibility(
	ctx: EvaluationContext,
	support: HardwareTransactionLegibilityImplementation,
): Evaluation {
	const { calldataDigestLocation, messageSigningLegibility } = unwrapHardwareErc8213(support)
	const features = analyzeHardwareFeatures(
		support,
		calldataDigestLocation,
		messageSigningLegibility,
	)
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
	erc8213: {
		calldataDigest: boolean
		eip712Digest: boolean
	}
}

function analyzeSoftwareFeatures({
	erc8213,
	erc7730,
	transactionSimulations,
	transactionDetailsDisplay,
}: SoftwareTransactionLegibilityImplementation): SoftwareFeatureDetails {
	const { calldataDisplay, messageSigningLegibility } =
		erc8213 !== null && isSupported(erc8213)
			? erc8213
			: { calldataDisplay: null, messageSigningLegibility: null }

	const isDisplayed = (opt: DataDisplayOptions): boolean =>
		opt === DataDisplayOptions.SHOWN_BY_DEFAULT || opt === DataDisplayOptions.SHOWN_OPTIONALLY

	const erc8213CalldataDigest =
		calldataDisplay !== null && isDisplayed(calldataDisplay[CallDataDisplay.CALLDATA_DIGEST])

	const erc8213Eip712Digest =
		messageSigningLegibility !== null &&
		isDisplayed(messageSigningLegibility[MessageSigningDetails.EIP712_DIGEST])

	const details: SoftwareFeatureDetails = {
		calldataDisplay: { supported: [], missing: [] },
		transactions: { passing: [], partial: [], failing: [] },
		messageSigning: { supported: [], missing: [] },
		erc8213: {
			calldataDigest: erc8213CalldataDigest,
			eip712Digest: erc8213Eip712Digest,
		},
	}

	// Analyze calldata display
	if (calldataDisplay !== null) {
		if (isDisplayed(calldataDisplay[CallDataDisplay.RAW_HEX])) {
			details.calldataDisplay.supported.push('Raw hex display')
		} else {
			details.calldataDisplay.missing.push('Raw hex display')
		}

		if (isDisplayed(calldataDisplay[CallDataDisplay.FORMATTED])) {
			details.calldataDisplay.supported.push('Formatted output')
		} else {
			details.calldataDisplay.missing.push('Formatted output')
		}

		if (isDisplayed(calldataDisplay[CallDataDisplay.COPY_HEX_TO_CLIPBOARD])) {
			details.calldataDisplay.supported.push('Copy to clipboard')
		} else {
			details.calldataDisplay.missing.push('Copy to clipboard')
		}
	}

	// Analyze global basic transaction details
	if (transactionDetailsDisplay !== null) {
		const missingFields: string[] = []

		if (!isShown(transactionDetailsDisplay.gas)) {
			missingFields.push('gas')
		}

		if (!isShown(transactionDetailsDisplay.nonce)) {
			missingFields.push('nonce')
		}

		if (!isShown(transactionDetailsDisplay.from)) {
			missingFields.push('from')
		}

		if (!isShown(transactionDetailsDisplay.to)) {
			missingFields.push('to')
		}

		if (!isShown(transactionDetailsDisplay.chain)) {
			missingFields.push('chain')
		}

		if (!isShown(transactionDetailsDisplay.value)) {
			missingFields.push('value')
		}

		if (missingFields.length > 0) {
			details.transactions.failing.push(
				`Transaction details (missing: ${commaListFormat(missingFields)})`,
			)
		} else {
			details.transactions.passing.push('Transaction details')
		}
	}

	const erc7730Data = erc7730 !== null && isSupported(erc7730) ? erc7730 : null
	const simData =
		transactionSimulations !== null && isSupported(transactionSimulations)
			? transactionSimulations
			: null

	if (simData !== null) {
		// ERC-20 token transfer outcome
		if (!isTransactionOutcomeExplained(simData[BasicBenchmarkTransactions.ERC_20_TRANSFER])) {
			details.transactions.partial.push('ERC-20 token transfer (outcome not explained)')
		} else {
			details.transactions.passing.push('ERC-20 token transfer')
		}

		// ERC-721 NFT transfer outcome
		if (!isTransactionOutcomeExplained(simData[BasicBenchmarkTransactions.ERC_721_TRANSFER])) {
			details.transactions.partial.push('ERC-721 NFT transfer (outcome not explained)')
		} else {
			details.transactions.passing.push('ERC-721 NFT transfer')
		}

		// ERC-1155 token transfer outcome
		if (!isTransactionOutcomeExplained(simData[BasicBenchmarkTransactions.ERC_1155_TRANSFER])) {
			details.transactions.partial.push('ERC-1155 token transfer (outcome not explained)')
		} else {
			details.transactions.passing.push('ERC-1155 token transfer')
		}

		// USDC approval (erc7730 decoded required to reach PARTIAL)
		{
			const usdcErc7730Entry =
				erc7730Data !== null ? erc7730Data[ComplexBenchmarkTransactions.USDC_APPROVAL] : null
			const usdcSimEntry = simData[ComplexBenchmarkTransactions.USDC_APPROVAL]

			if (!isTransactionDecoded(usdcErc7730Entry)) {
				details.transactions.failing.push('USDC approval (calldata not decoded)')
			} else if (!isTransactionOutcomeExplained(usdcSimEntry)) {
				details.transactions.partial.push('USDC approval (outcome not explained)')
			} else {
				details.transactions.passing.push('USDC approval')
			}
		}

		// Aave supply
		{
			const aaveErc7730Entry =
				erc7730Data !== null ? erc7730Data[ComplexBenchmarkTransactions.AAVE_SUPPLY] : null
			const aaveSimEntry = simData[ComplexBenchmarkTransactions.AAVE_SUPPLY]

			if (!isTransactionDecoded(aaveErc7730Entry)) {
				details.transactions.failing.push('Aave supply (calldata not decoded)')
			} else if (!isTransactionOutcomeExplained(aaveSimEntry)) {
				details.transactions.partial.push('Aave supply (outcome not explained)')
			} else {
				details.transactions.passing.push('Aave supply')
			}
		}

		// Safe nested Aave supply
		{
			const safeNestedErc7730Entry =
				erc7730Data !== null
					? erc7730Data[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]
					: null
			const safeNestedSimEntry = simData[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]

			if (!isTransactionDecoded(safeNestedErc7730Entry)) {
				details.transactions.partial.push('Safe nested Aave supply (calldata not decoded)')
			} else if (!isTransactionOutcomeExplained(safeNestedSimEntry)) {
				details.transactions.partial.push('Safe nested Aave supply (outcome not explained)')
			} else {
				details.transactions.passing.push('Safe nested Aave supply')
			}
		}

		// Safe nested multisend
		{
			const safeMultisendErc7730Entry =
				erc7730Data !== null
					? erc7730Data[
							ComplexBenchmarkTransactions
								.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
						]
					: null
			const safeMultisendSimEntry =
				simData[
					ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
				]

			if (!isTransactionDecoded(safeMultisendErc7730Entry)) {
				details.transactions.partial.push('Safe nested multisend (calldata not decoded)')
			} else if (!isTransactionOutcomeExplained(safeMultisendSimEntry)) {
				details.transactions.partial.push('Safe nested multisend (outcome not explained)')
			} else {
				details.transactions.passing.push('Safe nested multisend')
			}
		}

		// EOA nested multisend (AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
		{
			const batchApproveSupplyentry =
				erc7730Data !== null
					? erc7730Data[
							ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
						]
					: null
			const batchApproveSupplySimEntry =
				simData[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]

			if (!isTransactionDecoded(batchApproveSupplyentry)) {
				details.transactions.partial.push('EOA nested multisend (calldata not decoded)')
			} else if (!isTransactionOutcomeExplained(batchApproveSupplySimEntry)) {
				details.transactions.partial.push('EOA nested multisend (outcome not explained)')
			} else {
				details.transactions.passing.push('EOA nested multisend')
			}
		}

		// Failed transaction simulation
		{
			const tx = simData[SimulationBenchmarkTransactions.FAILED_TRANSACTION]

			if (tx === null || tx.failure !== 'DETECTED') {
				details.transactions.partial.push('Failed transaction simulation (failure not detected)')
			} else {
				details.transactions.passing.push('Failed transaction simulation')
			}
		}

		// Nondeterministic transaction simulation
		{
			const tx = simData[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]

			if (tx !== null && tx.nondeterminism === 'NO_OUTCOME_SHOWN') {
				details.transactions.partial.push(
					'Nondeterministic transaction simulation (no outcome shown)',
				)
			} else if (tx !== null && tx.nondeterminism === 'STATIC_SINGLE_OUTCOME') {
				details.transactions.partial.push(
					'Nondeterministic transaction simulation (nondeterminism not detected)',
				)
			} else if (tx !== null && tx.nondeterminism === 'RESIMULATES_NO_WARNING') {
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
			{ key: MessageSigningDetails.EIP712_DIGEST, label: 'EIP-712 digest' },
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

	// ERC-8213 compliance section
	const erc8213Full = features.erc8213.calldataDigest && features.erc8213.eip712Digest
	const erc8213Partial = features.erc8213.calldataDigest || features.erc8213.eip712Digest

	sections.push('\n**ERC-8213 Compliance**\n')

	if (erc8213Full) {
		sections.push('✓ Fully implemented: Calldata digest and EIP-712 digest are both shown.\n')
	} else if (erc8213Partial) {
		sections.push(
			`⚠ Partial: ${features.erc8213.calldataDigest ? '✓ Calldata digest' : '✗ Calldata digest'}, ${features.erc8213.eip712Digest ? '✓ EIP-712 digest' : '✗ EIP-712 digest'}.\n`,
		)
	} else {
		sections.push('✗ Not implemented: Neither Calldata digest nor EIP-712 digest is shown.\n')
	}

	return sections.join('\n')
}

function generateSoftwareHowToImprove(features: SoftwareFeatureDetails): string | undefined {
	const improvements: string[] = []

	if (features.calldataDisplay.missing.length > 0) {
		improvements.push(
			`**Calldata Display:** Implement ${commaListFormat(features.calldataDisplay.missing)} for calldata`,
		)
	}

	if (features.transactions.failing.length > 0) {
		improvements.push(
			`**Transaction Information:** Add the required fields or calldata decoding for:\n${features.transactions.failing
				.map(t => `- ${t}`)
				.join('\n')}`,
		)
	}

	if (features.transactions.partial.length > 0) {
		improvements.push(
			`**Transaction Clarity:**\n${features.transactions.partial.map(t => `- ${t}`).join('\n')}`,
		)
	}

	if (features.messageSigning.missing.length > 0) {
		improvements.push(
			`**Message Signing:** Add support for displaying:\n${features.messageSigning.missing.map(m => `- ${m}`).join('\n')}`,
		)
	}

	const erc8213Missing: string[] = []

	if (!features.erc8213.calldataDigest) {
		erc8213Missing.push(
			'**Calldata digest:** Show `keccak256(len(calldata) || calldata)` on the signing screen so users can independently verify the calldata.',
		)
	}

	if (!features.erc8213.eip712Digest) {
		erc8213Missing.push(
			'**EIP-712 digest:** Show the final `"\\x19\\x01" || domainSeparator || hashStruct(message)` hash during typed message signing.',
		)
	}

	if (erc8213Missing.length > 0) {
		improvements.push(
			`**ERC-8213 Implementation:** Implement the following to fully comply with ERC-8213:\n${erc8213Missing.map(m => `- ${m}`).join('\n')}`,
		)
	}

	if (improvements.length === 0) {
		return undefined
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
		howToImprove:
			improvementsMarkdown === undefined
				? undefined
				: markdown(
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
		howToImprove:
			improvementsMarkdown === undefined
				? undefined
				: markdown(
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

	const { erc7730, detailsDisplayed, dataExtraction, erc8213 } = hardwareTransactionLegibility

	if (
		erc7730 === null ||
		detailsDisplayed === null ||
		dataExtraction === null ||
		erc8213 === null
	) {
		return unrated(ctx)
	}

	if (!isSupported(erc8213) || !isSupported(erc7730)) {
		return hardwareNoTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	const calldataDigestOnDevice =
		erc8213.calldataDisplay !== null &&
		erc8213.calldataDisplay[CallDataDisplay.CALLDATA_DIGEST].location === DataLocation.ON_DEVICE

	const eip712DigestOnDevice =
		erc8213.messageSigningLegibility !== null &&
		evaluateHardwareMessageSigning(erc8213.messageSigningLegibility)

	// Full ERC-8213: calldata digest on-device AND EIP-712 digest on-device
	const erc8213Full = calldataDigestOnDevice && eip712DigestOnDevice

	// Any ERC-8213 support: at minimum EIP-712 or calldata digest shown on-device
	const erc8213HasSupport = eip712DigestOnDevice || calldataDigestOnDevice

	// Full ERC-7730: decodes inner calldata of batched AND safe transactions on-device
	const erc7730Full =
		erc7730[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED] ===
			DataLocation.ON_DEVICE &&
		erc7730[
			ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
		] === DataLocation.ON_DEVICE &&
		erc7730[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND] ===
			DataLocation.ON_DEVICE

	// Any ERC-7730 support: at least basic transactions decoded on-device
	const erc7730HasSupport =
		erc7730Full ||
		erc7730[ComplexBenchmarkTransactions.USDC_APPROVAL] === DataLocation.ON_DEVICE ||
		erc7730[ComplexBenchmarkTransactions.AAVE_SUPPLY] === DataLocation.ON_DEVICE

	// FAIL: neither ERC-8213 nor ERC-7730 supported
	if (!erc8213HasSupport && !erc7730HasSupport) {
		return hardwareNoTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	// PASS: both fully supported
	if (erc8213Full && erc7730Full) {
		return hardwareFullTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	// PARTIAL: one or both partially supported
	if (erc7730HasSupport) {
		return hardwarePartialTransactionLegibility(ctx, hardwareTransactionLegibility)
	}

	return hardwareBasicTransactionLegibility(ctx, hardwareTransactionLegibility)
}

function evaluateSoftwareWalletTransactionLegibility(
	ctx: EvaluationContext,
	softwareTransactionLegibility: SoftwareTransactionLegibilityImplementation,
): Evaluation {
	const transactionLegibilitySupport = ctx.popRefs(softwareTransactionLegibility)

	const { erc8213, erc7730, transactionDetailsDisplay } = transactionLegibilitySupport

	if (transactionDetailsDisplay === null || erc8213 === null || erc7730 === null) {
		return unrated(ctx)
	}

	// ERC-8213 support level
	if (!isSupported(erc8213) || !isSupported(erc7730)) {
		return softwareNoTransactionLegibility(ctx, softwareTransactionLegibility)
	}

	if (erc8213.calldataDisplay === null || erc8213.messageSigningLegibility === null) {
		return unrated(ctx)
	}

	const calldataDisplay = erc8213 !== null ? erc8213.calldataDisplay : null
	const messageSigningLegibility = erc8213 !== null ? erc8213.messageSigningLegibility : null

	const eip712DigestShown =
		messageSigningLegibility !== null && evaluateSoftwareMessageSigning(messageSigningLegibility)
	const calldataHexShown =
		calldataDisplay !== null && isShown(calldataDisplay[CallDataDisplay.RAW_HEX])
	const calldataDigestShown =
		calldataDisplay !== null && isShown(calldataDisplay[CallDataDisplay.CALLDATA_DIGEST])

	// Full ERC-8213: calldata hex + calldata digest + EIP-712 digest
	const erc8213Full = calldataHexShown && calldataDigestShown && eip712DigestShown
	// Any ERC-8213 support: at minimum shows EIP-712 digest
	const erc8213HasSupport = eip712DigestShown

	// ERC-7730 support level

	const usdcEntry = erc7730[ComplexBenchmarkTransactions.USDC_APPROVAL] ?? null
	const aaveEntry = erc7730[ComplexBenchmarkTransactions.AAVE_SUPPLY] ?? null
	const safeNestedEntry =
		erc7730[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED] ?? null
	const safeMultisendEntry =
		erc7730[
			ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND
		] ?? null
	const eoaBatchEntry =
		erc7730[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND] ?? null

	const usdcDecoded = usdcEntry !== null ? usdcEntry.decoded : DataDisplayOptions.NOT_IN_UI
	const aaveDecoded = aaveEntry !== null ? aaveEntry.decoded : DataDisplayOptions.NOT_IN_UI
	const safeNestedDecoded =
		safeNestedEntry !== null ? safeNestedEntry.decoded : DataDisplayOptions.NOT_IN_UI
	const safeMultisendDecoded =
		safeMultisendEntry !== null ? safeMultisendEntry.decoded : DataDisplayOptions.NOT_IN_UI
	const eoaBatchDecoded = eoaBatchEntry !== null ? eoaBatchEntry.decoded : null

	// Full ERC-7730: decodes inner calldata of batched AND safe transactions
	const erc7730Full =
		isShown(safeNestedDecoded) &&
		isShown(safeMultisendDecoded) &&
		(eoaBatchDecoded === null || isShown(eoaBatchDecoded))

	// Any ERC-7730 support: at least basic human-readable calldata decoded
	const erc7730HasSupport = erc7730Full || isShown(usdcDecoded) || isShown(aaveDecoded)

	ctx.addRef(softwareTransactionLegibility)

	// FAIL: no support for either ERC-8213 or ERC-7730
	if (!erc8213HasSupport && !erc7730HasSupport) {
		return softwareNoTransactionLegibility(ctx, softwareTransactionLegibility)
	}

	// PASS: both fully supported
	if (erc8213Full && erc7730Full) {
		return softwareFullTransactionLegibility(ctx, softwareTransactionLegibility)
	}

	// PARTIAL: one or both partially supported
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

		Without this, users are at the mercy of the app they are interacting with sending them bad transactions, whether due to a bug, a hack, or malicious intent. Without being able to verify what they are signing, users should not send such transactions.

		Full transaction legibility implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the wallet screen alongside decoded calldata,
		allowing users to make informed decisions before authorizing transactions.

		**${eipMarkdownLink(erc7730)}: Standardizing Calldata Decoding**
		${eipMarkdownShortLink(erc7730)} defines a standard JSON descriptor format for structured calldata,
		enabling wallets to display human-readable descriptions of smart contract calls.
		Instead of showing raw hex calldata, wallets that implement ${eipMarkdownShortLink(erc7730)} can show
		the function name and decoded parameters in plain language — for example,
		"Approve 100 USDC for Aave" instead of the raw \`0x095ea7b3...\` bytes.

		For hardware wallets, on-device ${eipMarkdownShortLink(erc7730)} decoding is especially valuable:
		even if the companion software is compromised, the device itself can still display the correct
		decoded description of the transaction being signed. Wallets are evaluated against a set of
		benchmark transactions — from simple token approvals to complex Safe nested multisend batches — to
		measure how broad their ${eipMarkdownShortLink(erc7730)} coverage is.

		**${eipMarkdownLink(erc8213)}: Standardizing What Users Sign**
		${eipMarkdownShortLink(erc8213)} introduces two cryptographic digests that give users a
		machine-verifiable way to confirm exactly what they are approving:

		- **Calldata digest**, \`keccak256(len(calldata) || calldata)\`: a hash of the raw transaction calldata. Users can compute this independently to verify the calldata hasn't been tampered with.
		- **EIP-712 digest**, \`"\\x19\\x01" || domainSeparator || hashStruct(message)\`: the final hash that gets signed for typed structured data.

		A full ${eipMarkdownShortLink(erc8213)} implementation means the wallet shows both digests, enabling users to independently verify every transaction and signature: not just trust what the UI displays.
	`),
	methodology: markdown(`
		Wallets are evaluated based on key aspects of transaction legibility, with different criteria for software and hardware wallets:

		**${eipMarkdownShortLink(erc7730)} Calldata Decoding:**
		The wallet's ability to decode and display calldata for complex transaction types using ${eipMarkdownShortLink(erc7730)}, including:
		- Token approvals
		- DeFi interactions (e.g. Aave supply)
		- Safe nested transactions
		- Complex nested multisend batches (EOA and Safe)

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
		- Calldata digest (ERC-8213): Users can verify the calldata hash independently

		Software wallets must also support calldata decoding for various transaction types, from basic token transfers to complex nested transactions, and must display the ${eipMarkdownShortLink(eip712)} digest for typed message signing (${eipMarkdownLink(erc8213)}).

		**Hardware Wallet Specific Requirements:**
		For hardware wallets, the signature/transaction information *must* be visible on the hardware wallet device itself. Any data shown only in a companion app or browser extension is ignored for hardware wallet ratings.

		Hardware wallets are evaluated on their ${eipMarkdownShortLink(erc7730)} calldata decoding coverage. Decoding is only counted when it happens on-device: off-device decoding in a companion app cannot be trusted if the companion app is compromised. The benchmark transactions range from simple token approvals to complex Safe nested multisend batches.

		Hardware wallets must also provide data extraction methods to allow users to independently verify transaction data:
		- Visual display: Users can view the data on the hardware wallet screen
		- QR code: Users can scan a QR code displayed on the device to extract data
		- Hashes: Users can compare hashes displayed on the device to verify data

		The Calldata digest and ${eipMarkdownShortLink(eip712)} digest (${eipMarkdownLink(erc8213)}) must be shown on the device itself.

		**${eipMarkdownLink(erc8213)} Compliance:**
		A wallet fully implements ${eipMarkdownShortLink(erc8213)} when it displays both:
		- The **Calldata digest** for transactions with calldata
		- The **${eipMarkdownShortLink(eip712)} digest** for typed structured data signatures

		For hardware wallets, both must be shown on the device screen (not just in companion software).

		**Rating Criteria:**

		For software wallets:
		- A wallet receives a passing rating if it displays calldata in all formats (raw hex, formatted, copyable, digest), displays all essential transaction details, supports complex calldata decoding, and shows the ${eipMarkdownShortLink(eip712)} digest for message signing (full ${eipMarkdownShortLink(erc8213)} compliance).
		- A wallet receives a partial rating if it has some combination of these features but not all.
		- A wallet receives a failing rating if it lacks calldata display capabilities or does not display essential transaction details.

		For hardware wallets:
		- A wallet receives a passing rating if it supports on-device ${eipMarkdownShortLink(erc7730)} decoding for complex nested transactions, displays all essential transaction details on the device, and provides comprehensive data extraction methods (QR codes and hashes). It must also implement ${eipMarkdownLink(erc8213)} (Calldata digest and ${eipMarkdownShortLink(eip712)} digest on-device).
		- A wallet receives a partial rating if it has some combination of these features but not all at the full level.
		- A wallet receives a failing rating if it lacks ${eipMarkdownShortLink(erc7730)} support, does not display essential transaction details on the device, and provides no effective data extraction methods.
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
						erc8213: null,
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.ON_DEVICE,
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								DataLocation.ON_DEVICE,
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								DataLocation.ON_DEVICE,
						}),
						detailsDisplayed: displaysFullTransactionDetails,
						dataExtraction: {
							[DataExtraction.EYES]: true,
							[DataExtraction.QRCODE]: true,
							[DataExtraction.HASHES]: true,
						},
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The hardware wallet implements full transaction legibility with complete ERC-8213
					compliance: calldata digest and EIP-712 digest are both shown on-device.
				`),
				hardwareFullTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[CallDataDisplay.FORMATTED]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[CallDataDisplay.CALLDATA_DIGEST]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[MessageSigningDetails.DOMAIN_HASH]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[MessageSigningDetails.MESSAGE_HASH]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[MessageSigningDetails.EIP712_DIGEST]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
							},
						}),
						erc7730: null,
						detailsDisplayed: null,
						dataExtraction: null,
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
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
						}),
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
						}),
						transactionSimulations: supported<SoftwareTransactionSimulations>({
							[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
							[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									transactionOutcome: TransactionOutcome.EXPLAINED,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
								failure: 'DETECTED',
							},
							[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
								nondeterminism: 'RESIMULATES_WITH_WARNING',
							},
						}),
						transactionDetailsDisplay: displaysFullTransactionDetails,
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
						erc8213: null,
						erc7730: null,
						detailsDisplayed: {
							gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
							nonce: DataDisplayOptions.NOT_IN_UI,
							from: DataDisplayOptions.SHOWN_BY_DEFAULT,
							to: DataDisplayOptions.SHOWN_BY_DEFAULT,
							chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
							value: DataDisplayOptions.SHOWN_BY_DEFAULT,
						},
						dataExtraction: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The hardware wallet decodes a basic contract interaction on-device but lacks
					support for complex nested transactions, and data extraction is visual-only.
				`),
				hardwareBasicTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: null,
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.NOT_PROVIDED,
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]:
								DataLocation.NOT_PROVIDED,
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								DataLocation.NOT_PROVIDED,
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								DataLocation.NOT_PROVIDED,
						}),
						detailsDisplayed: displaysFullTransactionDetails,
						dataExtraction: {
							[DataExtraction.EYES]: true,
							[DataExtraction.QRCODE]: false,
							[DataExtraction.HASHES]: false,
						},
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The hardware wallet decodes basic transactions on-device and shows the EIP-712 digest for
					message signing, but the calldata digest is only available off-device via the companion app,
					and complex nested transactions are not decoded.
				`),
				hardwareBasicTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.OFF_DEVICE,
								},
								[CallDataDisplay.FORMATTED]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.OFF_DEVICE,
								},
								[CallDataDisplay.CALLDATA_DIGEST]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.OFF_DEVICE,
								},
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: {
									display: DataDisplayOptions.NOT_IN_UI,
									location: DataLocation.NOT_PROVIDED,
								},
								[MessageSigningDetails.DOMAIN_HASH]: {
									display: DataDisplayOptions.NOT_IN_UI,
									location: DataLocation.NOT_PROVIDED,
								},
								[MessageSigningDetails.MESSAGE_HASH]: {
									display: DataDisplayOptions.NOT_IN_UI,
									location: DataLocation.NOT_PROVIDED,
								},
								[MessageSigningDetails.EIP712_DIGEST]: {
									display: DataDisplayOptions.SHOWN_BY_DEFAULT,
									location: DataLocation.ON_DEVICE,
								},
							},
						}),
						erc7730: null,
						detailsDisplayed: null,
						dataExtraction: null,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet implements partial transaction legibility: basic fields are shown
					but some are missing (gas, nonce, chain), and not all transaction outcomes are explained.
				`),
				softwarePartialTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
						}),
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									decoded: DataDisplayOptions.NOT_IN_UI,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						transactionSimulations: supported<SoftwareTransactionSimulations>({
							[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
							[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
								failure: 'DETECTED',
							},
							[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
								nondeterminism: 'STATIC_SINGLE_OUTCOME',
							},
						}),
						transactionDetailsDisplay: displaysFullTransactionDetails,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet shows raw hex calldata and supports EIP-712 message signing,
					but does not show the calldata digest required for full ERC-8213 compliance,
					and not all transaction outcomes are explained.
				`),
				softwarePartialTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
						}),
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									decoded: DataDisplayOptions.NOT_IN_UI,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						transactionSimulations: supported<SoftwareTransactionSimulations>({
							[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
							[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								transactionOutcome: TransactionOutcome.EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
								failure: 'DETECTED',
							},
							[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
								nondeterminism: 'STATIC_SINGLE_OUTCOME',
							},
						}),
						transactionDetailsDisplay: displaysFullTransactionDetails,
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
						erc8213: null,
						erc7730: notSupported,
						detailsDisplayed: displaysNoTransactionDetails,
						dataExtraction: noDataExtraction,
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
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
								[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									decoded: DataDisplayOptions.NOT_IN_UI,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						transactionSimulations: supported<SoftwareTransactionSimulations>({
							[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
							[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
								failure: 'NOT_DETECTED',
							},
							[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
								nondeterminism: 'NO_OUTCOME_SHOWN',
							},
						}),
						transactionDetailsDisplay: displaysNoTransactionDetails,
						ref: refNotNecessary,
					},
				),
			),
			exampleRating(
				paragraph(`
					The software wallet claims ERC-8213 support but does not show raw hex calldata,
					failing the basic transparency requirement.
				`),
				softwareNoTransactionLegibility(
					EvaluationContext.forTest(() => transactionLegibility),
					{
						erc8213: supported({
							calldataDisplay: {
								[CallDataDisplay.RAW_HEX]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
								[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
							messageSigningLegibility: {
								[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
								[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						erc7730: supported({
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									decoded: DataDisplayOptions.NOT_IN_UI,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								decoded: DataDisplayOptions.NOT_IN_UI,
							},
						}),
						transactionSimulations: supported<SoftwareTransactionSimulations>({
							[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
							[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
							[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
								{
									transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
								},
							[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
								transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
							},
							[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
								failure: 'NOT_DETECTED',
							},
							[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
								nondeterminism: 'NO_OUTCOME_SHOWN',
							},
						}),
						transactionDetailsDisplay: displaysNoTransactionDetails,
						ref: refNotNecessary,
					},
				),
			),
		],
	},
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Self-test.

		if (ctx.features.security.transactionLegibility === null) {
			return unrated(ctx)
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
