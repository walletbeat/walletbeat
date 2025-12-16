import type { WithRef } from '@/schema/reference'

import { isSupported, notSupported, type Support } from '../support'

export enum TransactionDisplayOptions {
	/** Shown by default on the transaction approval screen */
	SHOWN_BY_DEFAULT = 'SHOWN_BY_DEFAULT',
	/** Available on the transaction approval screen but requires user action (e.g., clicking a button) or enabling in settings */
	SHOWN_OPTIONALLY = 'SHOWN_OPTIONALLY',
	/** Not displayed in the wallet UI */
	NOT_IN_UI = 'NOT_IN_UI',
}

/**
 * How are the essential transaction data displayed by the hardware wallet?
 */
export interface DisplayedTransactionDetails {
	gas: TransactionDisplayOptions
	nonce: TransactionDisplayOptions
	from: TransactionDisplayOptions
	to: TransactionDisplayOptions
	chain: TransactionDisplayOptions
	value: TransactionDisplayOptions
}

/**
 * The wallet displays no transaction details.
 */
export const displaysNoTransactionDetails: DisplayedTransactionDetails = {
	gas: TransactionDisplayOptions.NOT_IN_UI,
	nonce: TransactionDisplayOptions.NOT_IN_UI,
	from: TransactionDisplayOptions.NOT_IN_UI,
	to: TransactionDisplayOptions.NOT_IN_UI,
	chain: TransactionDisplayOptions.NOT_IN_UI,
	value: TransactionDisplayOptions.NOT_IN_UI,
}

/**
 * The wallet displays all the possible transaction details.
 */
export const displaysFullTransactionDetails: DisplayedTransactionDetails = {
	gas: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
	nonce: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
	from: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
	to: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
	chain: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
	value: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
}

/**
 * Important: THIS INFORMATION MUST BE ON THE WALLET ITSELF. We do not trust the software "around" the wallets.
 *
 * To judge this feature of calldata decoding, we will assess a "hard-and-fast" rule of "can you decode this specific set of calldata?"
 * Hardware wallets could "cheat" this system by hard-coding just these transactions to pass the test, so we expect this list to grow over time.
 * Additionally, calldata decoding might get more advanced over time, so this list may change.
 */
export enum CalldataDecoding {
	/**
	 * USDC transfer transaction
	 * cast calldata "transfer(address,uint256)" 0x06496E706bB260Bef1656297A7eaDDF5D3E7788A 1000000000000000000
	 * https://tools.cyfrin.io/abi-encoding?data=0xa9059cbb00000000000000000000000006496e706bb260bef1656297a7eaddf5d3e7788a0000000000000000000000000000000000000000000000000de0b6b3a7640000
	 *
	 *   📞 Function: transfer(address,uint256)
	 *   📋 Parameters:
	 *     param0: 0x06496E706bB260Bef1656297A7eaDDF5D3E7788A
	 *     param1: 1000000000000000000
	 */
	ETH_USDC_TRANSFER = 'ETH_USDC_TRANSFER',

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
	 * ZKSync USDC transfer transaction
	 * Same as above, but on a non-mainnet chain
	 */
	ZKSYNC_USDC_TRANSFER = 'ZKSYNC_USDC_TRANSFER',

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
	 *       🔤 Raw Data: 0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000Add commentMore actions
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

/**
 * Types of transactions that a wallet can decode the calldata of.
 */
export type CalldataDecodingTypes = Record<
	CalldataDecoding,
	Support<WithRef<CalldataDecodingSupport>>
>

/** If a wallet can decode the calldata for a specific transaction, what does that look like? */
export interface CalldataDecodingSupport {
	/** Where does the calldata decoding actually happen? */
	decoded: CalldataDecoded
}

/** Where does the calldata decoding actually happen? */
export enum CalldataDecoded {
	ON_DEVICE = 'ON_DEVICE',
	OFF_DEVICE = 'OFF_DEVICE',
}
/**
 * Shorthand for a wallet that cannot do any calldata decoding.
 */
export const noCalldataDecoding: CalldataDecodingTypes = {
	[CalldataDecoding.ETH_USDC_TRANSFER]: notSupported,
	[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: notSupported,
	[CalldataDecoding.USDC_APPROVAL]: notSupported,
	[CalldataDecoding.AAVE_SUPPLY]: notSupported,
	[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: notSupported,
	[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: notSupported,
}

/**
 * Returns whether the given dataExtractionMethods supports any data
 * extraction method at all.
 */
export function supportsAnyCalldataDecoding(calldataDecodingTypes: CalldataDecodingTypes): boolean {
	return Object.values(calldataDecodingTypes).some(isSupported)
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
 * A record of transaction legibility support (both message and transaction)
 */
export interface HardwareTransactionLegibilitySupport {
	/**
	 * Does a wallet display transaction details clearly?
	 */
	legibility: CalldataDecodingTypes | null
	/**
	 * Does a wallet display transaction details clearly?
	 */
	detailsDisplayed: DisplayedTransactionDetails | null

	/**
	 * Does a wallet allow for data extraction?
	 */
	dataExtraction: DataExtractionMethods | null
}

/**
 * What can the user do with the calldata?
 */
export interface CallDataDisplay {
	/* Can display the calldata in raw hex format */
	rawHex: boolean

	/* Can the user copy the raw hex code to the clipboard? */
	copyHexToClipboard: boolean

	/* Can display the calldata in some formatted output (e.g. JSON) */
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
	 */
	transactionDetailsDisplay: DisplayedTransactionDetails | null
}

export const isFullTransactionDetails = (details: DisplayedTransactionDetails): boolean => {
	return (
		details.gas === TransactionDisplayOptions.SHOWN_BY_DEFAULT &&
		details.nonce === TransactionDisplayOptions.SHOWN_BY_DEFAULT &&
		details.from === TransactionDisplayOptions.SHOWN_BY_DEFAULT &&
		details.to === TransactionDisplayOptions.SHOWN_BY_DEFAULT &&
		details.chain === TransactionDisplayOptions.SHOWN_BY_DEFAULT &&
		details.value === TransactionDisplayOptions.SHOWN_BY_DEFAULT
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
