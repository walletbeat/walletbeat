import type { WithRef } from '@/schema/reference'
import { Enum, mergeEnums } from '@/utils/enum'


export enum DataDisplayOptions {
	/** Shown by default on the transaction approval screen */
	SHOWN_BY_DEFAULT = 'SHOWN_BY_DEFAULT',
	/** Available on the transaction approval screen but requires user action (e.g., clicking a button) or enabling in settings */
	SHOWN_OPTIONALLY = 'SHOWN_OPTIONALLY',
	/** Not displayed in the wallet UI */
	NOT_IN_UI = 'NOT_IN_UI',
}

/**
 * How are the essential transaction data displayed by the wallet for basic transactions?
 * Basic transactions have a clear recipient and value.
 */
export interface DisplayedBasicTransactionDetails {
	gas: DataDisplayOptions
	nonce: DataDisplayOptions
	from: DataDisplayOptions
	to: DataDisplayOptions
	chain: DataDisplayOptions
	value: DataDisplayOptions
}

/**
 * The wallet displays no basic transaction details.
 */
export const displaysNoTransactionDetails: DisplayedBasicTransactionDetails = {
	gas: DataDisplayOptions.NOT_IN_UI,
	nonce: DataDisplayOptions.NOT_IN_UI,
	from: DataDisplayOptions.NOT_IN_UI,
	to: DataDisplayOptions.NOT_IN_UI,
	chain: DataDisplayOptions.NOT_IN_UI,
	value: DataDisplayOptions.NOT_IN_UI,
}

/**
 * The wallet displays all the possible basic transaction details.
 */
export const displaysFullTransactionDetails: DisplayedBasicTransactionDetails = {
	gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
	nonce: DataDisplayOptions.SHOWN_BY_DEFAULT,
	from: DataDisplayOptions.SHOWN_BY_DEFAULT,
	to: DataDisplayOptions.SHOWN_BY_DEFAULT,
	chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
	value: DataDisplayOptions.SHOWN_BY_DEFAULT,
}

/**
 * Whether the effect of a complex transaction is explained to the user.
 */
export enum TransactionOutcome {
	/** The effect of the transaction is clearly explained. */
	EXPLAINED = 'EXPLAINED',
	/** The effect of the transaction is not explained or unclear, requiring manual user intervention to understand (e.g. interpret calldata). */
	NOT_EXPLAINED = 'NOT_EXPLAINED',
}

/**
 * How are the essential transaction data displayed by the wallet for complex transactions?
 * Complex transactions interact with contracts, so there is no simple "to" address or "value" —
 * instead we evaluate whether the transaction outcome is explained.
 */
export interface DisplayedComplexTransactionDetails {
	gas: DataDisplayOptions
	nonce: DataDisplayOptions
	from: DataDisplayOptions
	to: DataDisplayOptions
	chain: DataDisplayOptions
	value: DataDisplayOptions
	calldataDecoded: DataDisplayOptions
	transactionOutcome: TransactionOutcome
}

/**
 * Benchmark transactions for basic operations with a clear recipient and value.
 *
 * Important: THIS INFORMATION MUST BE ON THE WALLET ITSELF for hardware wallets.
 * We do not trust the software "around" the wallets.
 *
 * To judge this feature, we will assess a "hard-and-fast" rule of "can you decode this specific set of calldata?"
 * Hardware wallets could "cheat" this system by hard-coding just these transactions to pass the test,
 * so we expect this list to grow over time.
 */
export enum BasicBenchmarkTransactions {
	/**
	 * Plain ETH transfer to an EOA (no calldata).
	 * A simple send of Ether to another address.
	 */
	ETH_TRANSFER = 'ETH_TRANSFER',

	ERC_20_TRANSFER = 'ERC_20_TRANSFER',
	ERC_721_TRANSFER = 'ER_721_TRANSFER',

	/**
	 * ZKSync USDC transfer transaction
	 * Same as above, but on a non-mainnet chain
	 */
	ZKSYNC_USDC_TRANSFER = 'ZKSYNC_USDC_TRANSFER',
}

export const basicBenchmarkTransactions = new Enum<BasicBenchmarkTransactions>({
	[BasicBenchmarkTransactions.ETH_TRANSFER]: true,
	[BasicBenchmarkTransactions.ERC_20_TRANSFER]: true,
	[BasicBenchmarkTransactions.ERC_721_TRANSFER]: true,
	[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: true,
})

/**
 * Benchmark transactions for complex contract interactions.
 *
 * These transactions interact with smart contracts in non-trivial ways,
 * so there is no simple "to" address or "value" to display.
 * Instead, we evaluate whether the wallet explains the transaction outcome.
 */
export enum ComplexBenchmarkTransactions {
	/**
	 * USDC approval transaction
	 * cast calldata "approve(address,uint256)" 0x06496E706bB260Bef1656297A7eaDDF5D3E7788A 1000000
	 * https://tools.cyfrin.io/abi-encoding?data=0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240
	 *
	 *	📞 Function: approve(address,uint256)
	 *	📋 Parameters:
	 *     param0: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 - AAVE Address
	 *     param1: 1000000
	 *
	 *     To: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
	 */
	USDC_APPROVAL = 'USDC_APPROVAL',

	/**
	 * Aave supply transaction
	 * cast calldata "supply(address,uint256,address,uint16)" 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E 50000000000000000000 0x9467919138E36f0252886519f34a0f8016dDb3a3 0
	 * https://tools.cyfrin.io/abi-encoding?data=0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *
	 * 📞 Function: supply(address,uint256,address,uint16)
	 * 📋 Parameters:
	 *     param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *     param1: 50000000000000000000
	 *     param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *     param3: 0
	 */
	AAVE_SUPPLY = 'AAVE_SUPPLY',

	/**
	 * SafeWallet Aave supply transaction
	 * https://tools.cyfrin.io/abi-encoding?data=0x6a76120200000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
	 *
	 *   📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
	 *   📋 Parameters:
	 *     param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
	 *     param1: 0
	 *     param2:
	 *       📞 Function: supply(address,uint256,address,uint16)
	 *       🔍 Selector: 0x617ba037
	 *       📋 Parameters:
	 *         param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *         param1: 50000000000000000000
	 *         param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *         param3: 0
	 *       🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *     param3: 0
	 *     param4: 0
	 *     param5: 0
	 *     param6: 0
	 *     param7: 0x0000000000000000000000000000000000000000
	 *     param8: 0x0000000000000000000000000000000000000000
	 *     param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
	 */
	SAFEWALLET_AAVE_SUPPLY_NESTED = 'SAFEWALLET_AAVE_SUPPLY_NESTED',

	/**
	 * SafeWallet Aave USDC approve supply batch nested multi-send transaction
	 * https://tools.cyfrin.io/abi-encoding?data=0x6a761202000000000000000000000000f220d3b4dfb23c4ade8c88e526c1353abacbc38f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000001c48d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
	 *
	 *   📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
	 *   📋 Parameters:
	 *     param0: 0xf220D3b4DFb23C4ade8C88E526C1353AbAcbC38F
	 *     param1: 0
	 *     param2:
	 *       📞 Function: multiSend(bytes)
	 *       🔍 Selector: 0x8d80ff0a
	 *       📋 Parameters:
	 *         param0:
	 *           📦 Multi-Send (2 transactions):
	 *             [0] Transaction:
	 *               Operation: 0 (Call)
	 *               To: 0x5a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e
	 *               Value: 0
	 *               Data Length: 68
	 *               Decoded Call:
	 *                 📞 Function: approve(address,uint256)
	 *                 🔍 Selector: 0x095ea7b3
	 *                 📋 Parameters:
	 *                   param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
	 *                   param1: 50000000000000000000
	 *                 🔤 Raw Data: 0x095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b1880000
	 *             [1] Transaction:
	 *               Operation: 0 (Call)
	 *               To: 0x78e30497a3c7527d953c6b1e3541b021a98ac43c
	 *               Value: 0
	 *               Data Length: 132
	 *               Decoded Call:
	 *                 📞 Function: supply(address,uint256,address,uint16)
	 *                 🔍 Selector: 0x617ba037
	 *                 📋 Parameters:
	 *                   param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *                   param1: 50000000000000000000
	 *                   param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *                   param3: 0
	 *                 🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *       🔤 Raw Data: 0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
	 *     param3: 1
	 *     param4: 0
	 *     param5: 0
	 *     param6: 0
	 *     param7: 0x0000000000000000000000000000000000000000
	 *     param8: 0x0000000000000000000000000000000000000000
	 *     param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
	 */
	SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND = 'SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND',

	// In the future, add decoding of L1 -> L2 messages like `sendToL1`
}

export const complexBenchmarkTransactions = new Enum<ComplexBenchmarkTransactions>({
	[ComplexBenchmarkTransactions.USDC_APPROVAL]: true,
	[ComplexBenchmarkTransactions.AAVE_SUPPLY]: true,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: true,
})

/**
 * BenchmarkTransactions is the union of basic and complex benchmark transactions.
 * Used for hardware wallet calldata decoding evaluation.
 */
export type BenchmarkTransactions = BasicBenchmarkTransactions | ComplexBenchmarkTransactions

/** Merged enum for all benchmark transactions. */
export const benchmarkTransactions = mergeEnums(basicBenchmarkTransactions, complexBenchmarkTransactions)

/**
 * Benchmark transactions for simulation-specific scenarios.
 * These test the wallet's ability to simulate edge-case transaction outcomes.
 */
export enum SimulationBenchmarkTransactions {
	/** A transaction that will fail (revert). */
	FAILED_TRANSACTION = 'FAILED_TRANSACTION',

	/** A transaction that has nondeterministic outcome (e.g. depends on execution state). */
	NONDETERMINISTIC_TRANSACTION = 'NONDETERMINISTIC_TRANSACTION',
}

/**
 * Details for a failed simulation benchmark transaction.
 */
export interface DisplayedFailedTransactionDetails
	extends Omit<DisplayedComplexTransactionDetails, 'transactionOutcome' | 'calldataDecoded'> {
	failure: 'DETECTED' | 'NOT_DETECTED'
}

/**
 * Details for a nondeterministic simulation benchmark transaction.
 */
export interface DisplayedNondeterministicTransactionDetails
	extends Omit<DisplayedComplexTransactionDetails, 'transactionOutcome' | 'calldataDecoded'> {
	nondeterminism: 'NOT_DETECTED' | 'DETECTED_WITHOUT_WARNING' | 'DETECTED_WITH_WARNING'
}

/**
 * Display details for token transfer transactions (ERC-20, ERC-721).
 * These include a transaction outcome since the transfer involves contract interaction.
 */
export interface DisplayedTokenTransferDetails extends DisplayedBasicTransactionDetails {
	transactionOutcome: TransactionOutcome
}

/**
 * Per-benchmark-transaction display details for software wallets.
 * Each benchmark transaction records what the wallet shows when that transaction is being signed.
 */
export type SoftwareTransactionDetailsDisplay =
	| ({
			[BasicBenchmarkTransactions.ETH_TRANSFER]: DisplayedBasicTransactionDetails
			[BasicBenchmarkTransactions.ERC_20_TRANSFER]: DisplayedTokenTransferDetails
			[BasicBenchmarkTransactions.ERC_721_TRANSFER]: DisplayedTokenTransferDetails
			[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: DisplayedBasicTransactionDetails
		} & Record<ComplexBenchmarkTransactions, DisplayedComplexTransactionDetails> & {
			[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: DisplayedFailedTransactionDetails
		} & {
			[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: DisplayedNondeterministicTransactionDetails
		})
	| null

/**
 * Types of transactions that a wallet can decode the calldata of.
 */
export type CalldataDecodingTypes = Record<
	BenchmarkTransactions, DataDecoded

>

/**
 * Types of transactions that a wallet can decode the calldata of.
 */
export type SoftwareCalldataDecodingTypes = Record<BenchmarkTransactions, boolean>

/** Where does the calldata decoding actually happen? */
export enum DataDecoded {
	ON_DEVICE = 'ON_DEVICE',
	OFF_DEVICE = 'OFF_DEVICE',
	NOT_IN_UI = 'NOT_IN_UI',
}

/**
 * What does the wallet provide for message signing legibility?
 */
export enum MessageSigningDetails {
	/** The wallet provides the EIP-712 struct */
	EIP712_STRUCT = 'EIP712_STRUCT',
	/** The wallet provides the domain hash */
	DOMAIN_HASH = 'DOMAIN_HASH',
	/** The wallet provides the message hash */
	MESSAGE_HASH = 'MESSAGE_HASH',
	/** The wallet provides the Safe hash */
	SAFE_HASH = 'SAFE_HASH',
}

/**
 * For software wallets: track which message signing data types are available
 */
export type SoftwareMessageSigningLegibility = Record<
	MessageSigningDetails,
	DataDisplayOptions
> | null

/**
 * For hardware wallets: track which message signing data types are available and where they are displayed
 */
export interface HardwareMessageSigningLegibility {
	/** Which message signing data types does the wallet provide? */
	messageSigningDetails: Record<MessageSigningDetails, DataDisplayOptions>
	/** Where does the message signing data display happen? */
	decoded: DataDecoded
}
/**
 * Shorthand for a wallet that cannot do any calldata decoding.
 */
export const noCalldataDecoding: CalldataDecodingTypes = {
	[BasicBenchmarkTransactions.ETH_TRANSFER]: DataDecoded.NOT_IN_UI,
	[BasicBenchmarkTransactions.ERC_20_TRANSFER]: DataDecoded.NOT_IN_UI,
	[BasicBenchmarkTransactions.ERC_721_TRANSFER]: DataDecoded.NOT_IN_UI,
	[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: DataDecoded.NOT_IN_UI,
	[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataDecoded.NOT_IN_UI,
	[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataDecoded.NOT_IN_UI,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataDecoded.NOT_IN_UI,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: DataDecoded.NOT_IN_UI,
}

/**
 * Returns whether the given dataExtractionMethods supports any data
 * extraction method at all.
 */
export function supportsAnyCalldataDecoding(calldataDecodingTypes: CalldataDecodingTypes): boolean {
	return Object.values(calldataDecodingTypes).some((v) => v !== DataDecoded.NOT_IN_UI)
}

/**
 * Data Extraction:
 *
 * How is a user able to extract that data from a hardware
 * wallet, in order to verify the information?
 *
 * IN FLUX: We as an industry will very hopefully come to a standard on what
 * wallets should do for this.
 * https://ethereum-magicians.org/t/standardizing-wallet-information-so-humans-can-actually-know-what-they-are-signing/24295
 */
export enum DataExtraction {
	/**
	 * Shows calldata/message data, but users have to look at it with their eyes.
	 */
	EYES = 'EYES',

	/**
	 * Shows calldata/message data, and a QR code to extract.
	 */
	QRCODE = 'QRCODE',

	/**
	 * Shows calldata/message data, and a group of hashes to compare against
	 */
	HASHES = 'HASHES',
}

/**
 * Set of data extraction methods that a wallet supports.
 */
export type DataExtractionMethods = Record<DataExtraction, boolean | null>

/**
 * Shorthand for a wallet that cannot do any data extraction.
 */
export const noDataExtraction: DataExtractionMethods = {
	[DataExtraction.EYES]: false,
	[DataExtraction.QRCODE]: false,
	[DataExtraction.HASHES]: false,
}

/**
 * Returns whether the given dataExtractionMethods supports any data
 * extraction method at all.
 */
export function supportsAnyDataExtraction(dataExtractionMethods: DataExtractionMethods): boolean {
	return Object.values(dataExtractionMethods).includes(true)
}

/**
 * Helper function to check if a calldata decoding is supported and ON_DEVICE
 */
export function isSupportedOnDevice(
	legibility: CalldataDecodingTypes,
	decoding: BenchmarkTransactions,
): boolean {
	return legibility[decoding] === DataDecoded.ON_DEVICE
}

/**
 * A record of transaction legibility support (both message and transaction)
 */
export interface HardwareTransactionLegibilitySupport {
	/**
	 * Does the wallet decode basic and complex transaction calldata to show function names and parameters?
	 */
	legibility: CalldataDecodingTypes | null
	/**
	 * Does a wallet display transaction details clearly?
	 */
	detailsDisplayed: DisplayedBasicTransactionDetails | null

	/**
	 * Does a wallet allow for data extraction?
	 */
	dataExtraction: DataExtractionMethods | null

	/**
	 * What message signing data does the hardware wallet provide and where is it displayed?
	 */
	messageSigningLegibility: HardwareMessageSigningLegibility | null
}

/**
 * What can the user do with the calldata?
 */
export interface CallDataDisplay {
	/* Can display the calldata in raw hex format */
	rawHex: boolean

	/* Can the user copy the raw hex code to the clipboard? */
	copyHexToClipboard: boolean

	/* Can display the calldata in some formatted output that shows function names and parameters (e.g. JSON / text) */
	formatted: boolean
}

export const displaysFullCallData: CallDataDisplay = {
	rawHex: true,
	copyHexToClipboard: true,
	formatted: true,
}

/**
 * A record of transaction legibility support (both message and transaction)
 */
export interface SoftwareTransactionLegibilitySupport {
	/**
	 * Does the software wallet support displaying the calldata in different formats?
	 */
	calldataDisplay: CallDataDisplay | null
	/**
	 * Does the software wallet support displaying the transaction details?
	 * Evaluated per benchmark transaction type.
	 */
	transactionDetailsDisplay: SoftwareTransactionDetailsDisplay

	/**
	 * What message signing data does the software wallet provide?
	 */
	messageSigningLegibility: SoftwareMessageSigningLegibility | null
}

export const isFullBasicTransactionDetails = (
	details: DisplayedBasicTransactionDetails,
): boolean => {
	return (
		details.gas === DataDisplayOptions.SHOWN_BY_DEFAULT &&
		details.nonce === DataDisplayOptions.SHOWN_BY_DEFAULT &&
		details.from === DataDisplayOptions.SHOWN_BY_DEFAULT &&
		details.to === DataDisplayOptions.SHOWN_BY_DEFAULT &&
		details.chain === DataDisplayOptions.SHOWN_BY_DEFAULT &&
		details.value === DataDisplayOptions.SHOWN_BY_DEFAULT
	)
}

/**
 * Type predicate for `HardwareTransactionLegibilityImplementation`.
 */
export function isHardwareTransactionLegibility(
	transactionLegibility:
		| HardwareTransactionLegibilityImplementation
		| SoftwareTransactionLegibilityImplementation,
): transactionLegibility is HardwareTransactionLegibilityImplementation {
	// The `dataExtraction` field exists only on `HardwareTransactionLegibilityImplementation`,
	// not on `SoftwareTransactionLegibilityImplementation`, so it is a good way to distinguish
	// between the two types:
	return Object.hasOwn(transactionLegibility, 'dataExtraction')
}

export type HardwareTransactionLegibilityImplementation =
	WithRef<HardwareTransactionLegibilitySupport>
export type SoftwareTransactionLegibilityImplementation =
	WithRef<SoftwareTransactionLegibilitySupport>
