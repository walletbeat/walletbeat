import { type FullyQualifiedReference, mergeRefs, type WithRef } from '@/schema/reference'
import { Enum, mergeEnums } from '@/utils/enum'

import { type Support } from '../support'

/**
 * To test: initiate the relevant transaction type and observe the approval
 * screen without clicking anything fee-related or expanding any sections.
 */
export enum DataDisplayOptions {
	/** Visible on the approval screen before any clicks or settings changes. */
	SHOWN_BY_DEFAULT = 'SHOWN_BY_DEFAULT',
	/**
	 * Visible only after at least one user action on the approval screen
	 * (e.g. tapping a row, clicking "Details", or enabling a setting).
	 */
	SHOWN_OPTIONALLY = 'SHOWN_OPTIONALLY',
	/** Not shown anywhere on the approval screen, even after interaction. */
	NOT_IN_UI = 'NOT_IN_UI',
}

/**
 * How are the essential transaction data displayed by the wallet for basic transactions?
 * Basic transactions have a clear recipient and value.
 * To test: initiate a plain ETH transfer (for ETH_TRANSFER) or an ERC-20 send
 * and check which of the fields below appear on the approval screen.
 */
export interface DisplayedBasicTransactionDetails {
	/** The gas fee / estimated network cost. */
	gas: DataDisplayOptions
	/** The transaction nonce. */
	nonce: DataDisplayOptions
	/** The sender address (the user's own address). */
	from: DataDisplayOptions
	/** The recipient address. */
	to: DataDisplayOptions
	/** The chain / network the transaction will be sent on. */
	chain: DataDisplayOptions
	/** The ETH value being sent. */
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
 *
 * For regular (EOA) transactions, "outcome" means the wallet explains what
 * the transaction will do to the signer's own address — e.g. "You are
 * approving 100 USDC to be spent by Aave", "You are supplying 1 ETH",
 * "You are receiving / sending ERC-721 / ERC-1155 tokens.".
 *
 * For Safe (multisig) transactions, the standard is identical: the wallet
 * must show what the Safe execution will actually do — the real-world effect
 * on the Safe's address. The signer is adding a confirmation to an
 * `execTransaction` call.
 *
 * To test: initiate the benchmark transaction and check whether the approval
 * screen describes the real-world effect in plain terms. For Safe transactions,
 * verify the wallet shows the outcome of what the Safe will execute, not just
 * the outer `execTransaction` parameters or a Safe tx hash.
 */
export enum TransactionOutcome {
	/**
	 * The effect is clearly explained.
	 * For EOA transactions: the wallet describes what will happen to the
	 * signer's address (e.g. token approvals / transfers, defi deposit).
	 * For Safe transactions: the wallet describes what will happen to the Safe address.
	 */
	EXPLAINED = 'EXPLAINED',

	/**
	 * The effect is not explained, leaving the user to interpret raw calldata.
	 * For Safe transactions, this includes wallets that only show the Safe
	 * tx hash or the outer `execTransaction` parameters without showing what
	 * the Safe will actually do.
	 */
	NOT_EXPLAINED = 'NOT_EXPLAINED',
}

/**
 * How are the essential transaction data displayed by the wallet for complex transactions?
 * Complex transactions interact with contracts, so there is no simple "to" address or "value" —
 * instead we evaluate whether the transaction outcome is explained.
 * To test: initiate the relevant benchmark transaction and observe the approval screen.
 *
 * Users can test on https://beta.walletbeat.eth.limo/test and
 * test a transaction request under `Transactions` tab.
 */
export interface DisplayedComplexTransactionDetails {
	/** The gas fee / estimated network cost. */
	gas: DataDisplayOptions
	/** The transaction nonce. */
	nonce: DataDisplayOptions
	/** The sender address. */
	from: DataDisplayOptions
	/** The contract being called. */
	to: DataDisplayOptions
	/** The chain / network the transaction will be sent on. */
	chain: DataDisplayOptions
	/** The ETH value attached to the call (often zero for token interactions). */
	value: DataDisplayOptions
	/**
	 * Whether the calldata is decoded into a human-readable function name and arguments.
	 * For Safe transactions, this means the wallet must decode the inner calldata
	 * (the `bytes` `data` parameter of `execTransaction`) — not just the outer
	 * `execTransaction` call itself. For example, a Safe Aave supply transaction
	 * wraps `supply(address,uint256,address,uint16)` inside `execTransaction(..., data, ...)`;
	 * decoding only the outer call leaves the inner `data` as an opaque hex blob.
	 */
	calldataDecoded: DataDisplayOptions
	/**
	 * Whether the real-world effect of the transaction is explained.
	 * See `TransactionOutcome` for the full definition, including the
	 * distinction for Safe (multisig) transactions.
	 */
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

	/**
	 * Sending of ERC-20 tokens to another address.
	 */
	ERC_20_TRANSFER = 'ERC_20_TRANSFER',
	/**
	 * Sending of ERC-721 tokens (NFTs) to another address.
	 */
	ERC_721_TRANSFER = 'ERC_721_TRANSFER',

	/**
	 * Sending of ERC-1155 tokens to another address.
	 */
	ERC_1155_TRANSFER = 'ERC_1155_TRANSFER',

	/**
	 * ZKSync USDC transfer transaction.
	 * Same as a token transfer, but on a non-mainnet chain.
	 */
	ZKSYNC_USDC_TRANSFER = 'ZKSYNC_USDC_TRANSFER',
}

export const basicBenchmarkTransactions = new Enum<BasicBenchmarkTransactions>({
	[BasicBenchmarkTransactions.ETH_TRANSFER]: true,
	[BasicBenchmarkTransactions.ERC_20_TRANSFER]: true,
	[BasicBenchmarkTransactions.ERC_721_TRANSFER]: true,
	[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: true,
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
	 * ```
	 * 📞 Function: approve(address,uint256)
	 * 📋 Parameters:
	 *   param0: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 - AAVE Address
	 *   param1: 1000000
	 * To: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
	 * ```
	 */
	USDC_APPROVAL = 'USDC_APPROVAL',

	/**
	 * Aave supply transaction
	 * cast calldata "supply(address,uint256,address,uint16)" 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E 50000000000000000000 0x9467919138E36f0252886519f34a0f8016dDb3a3 0
	 * https://tools.cyfrin.io/abi-encoding?data=0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *
	 * ```
	 * 📞 Function: supply(address,uint256,address,uint16)
	 * 📋 Parameters:
	 *   param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *   param1: 50000000000000000000
	 *   param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *   param3: 0
	 * ```
	 */
	AAVE_SUPPLY = 'AAVE_SUPPLY',

	/**
	 * SafeWallet Aave supply transaction
	 * https://tools.cyfrin.io/abi-encoding?data=0x6a76120200000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
	 *
	 * ```
	 * 📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
	 * 📋 Parameters:
	 *   param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
	 *   param1: 0
	 *   param2:
	 *     📞 Function: supply(address,uint256,address,uint16)
	 *     🔍 Selector: 0x617ba037
	 *     📋 Parameters:
	 *       param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *       param1: 50000000000000000000
	 *       param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *       param3: 0
	 *     🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *   param3: 0
	 *   param4: 0
	 *   param5: 0
	 *   param6: 0
	 *   param7: 0x0000000000000000000000000000000000000000
	 *   param8: 0x0000000000000000000000000000000000000000
	 *   param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
	 * ```
	 */
	SAFEWALLET_AAVE_SUPPLY_NESTED = 'SAFEWALLET_AAVE_SUPPLY_NESTED',

	/**
	 * SafeWallet Aave USDC approve supply batch nested multi-send transaction
	 * https://tools.cyfrin.io/abi-encoding?data=0x6a761202000000000000000000000000f220d3b4dfb23c4ade8c88e526c1353abacbc38f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000001c48d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
	 * ```
	 *
	 * 📞 Function: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
	 * 📋 Parameters:
	 *   param0: 0xf220D3b4DFb23C4ade8C88E526C1353AbAcbC38F
	 *   param1: 0
	 *   param2:
	 *     📞 Function: multiSend(bytes)
	 *     🔍 Selector: 0x8d80ff0a
	 *     📋 Parameters:
	 *       param0:
	 *         📦 Multi-Send (2 transactions):
	 *           [0] Transaction:
	 *             Operation: 0 (Call)
	 *             To: 0x5a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e
	 *             Value: 0
	 *             Data Length: 68
	 *             Decoded Call:
	 *               📞 Function: approve(address,uint256)
	 *               🔍 Selector: 0x095ea7b3
	 *               📋 Parameters:
	 *                 param0: 0x78e30497a3c7527d953c6B1E3541b021A98Ac43c
	 *                 param1: 50000000000000000000
	 *               🔤 Raw Data: 0x095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b1880000
	 *           [1] Transaction:
	 *             Operation: 0 (Call)
	 *             To: 0x78e30497a3c7527d953c6b1e3541b021a98ac43c
	 *             Value: 0
	 *             Data Length: 132
	 *             Decoded Call:
	 *               📞 Function: supply(address,uint256,address,uint16)
	 *               🔍 Selector: 0x617ba037
	 *               📋 Parameters:
	 *                 param0: 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E
	 *                 param1: 50000000000000000000
	 *                 param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
	 *                 param3: 0
	 *               🔤 Raw Data: 0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
	 *     🔤 Raw Data: 0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
	 *   param3: 1
	 *   param4: 0
	 *   param5: 0
	 *   param6: 0
	 *   param7: 0x0000000000000000000000000000000000000000
	 *   param8: 0x0000000000000000000000000000000000000000
	 *   param9: 0x000000000000000000000000f8cade19b26a2b970f2def5ea9eccf1bda3d1186000000000000000000000000000000000000000000000000000000000000000001
	 * ```
	 */
	SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND = 'SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND',

	/**
	 * https://tools.cyfrin.io/abi-encoding?data=0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000017200a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f42400087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba037000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
	 ```
			Function: multiSend(bytes)
		Parameters:
			param0:
				Multi-Send (2 transactions):
					[0] Transaction:
						Operation: 0 (Call)
						To: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
						Value: 0
						Data Length: 68
						Decoded Call:
							Function: approve(address,uint256)
							Selector: 0x095ea7b3
							Parameters:
								param0: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
								param1: 1000000
					[1] Transaction:
						Operation: 0 (Call)
						To: 0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2
						Value: 0
						Data Length: 132
						Decoded Call:
							Function: supply(address,uint256,address,uint16)
							Selector: 0x617ba037
							Parameters:
								param0: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
								param1: 1000000
								param2: 0x9467919138E36f0252886519f34a0f8016dDb3a3
								param3: 0
	```
	*/
	AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND = 'AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND',

	// In the future, add decoding of L1 -> L2 messages like `sendToL1`
}

export const complexBenchmarkTransactions = new Enum<ComplexBenchmarkTransactions>({
	[ComplexBenchmarkTransactions.USDC_APPROVAL]: true,
	[ComplexBenchmarkTransactions.AAVE_SUPPLY]: true,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: true,
	[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: true,
})

export const benchmarkTransactions = mergeEnums(
	basicBenchmarkTransactions,
	complexBenchmarkTransactions,
)

/**
 * @param tx The benchmark transaction to get a human-readable label for.
 * @returns Human-friendly label for the benchmark transaction.
 */
export function benchmarkTransactionLabel(
	tx: BasicBenchmarkTransactions | ComplexBenchmarkTransactions,
): string {
	switch (tx) {
		case BasicBenchmarkTransactions.ETH_TRANSFER:
			return 'plain ETH transfers'
		case BasicBenchmarkTransactions.ERC_20_TRANSFER:
			return 'basic token transfers (ERC-20)'
		case BasicBenchmarkTransactions.ERC_721_TRANSFER:
			return 'basic NFT transfers (ERC-721)'
		case BasicBenchmarkTransactions.ERC_1155_TRANSFER:
			return 'basic multi-token transfers (ERC-1155)'
		case BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER:
			return 'ZKSync token transfers'
		case ComplexBenchmarkTransactions.USDC_APPROVAL:
			return 'token approvals'
		case ComplexBenchmarkTransactions.AAVE_SUPPLY:
			return 'DeFi interactions (e.g., Aave)'
		case ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED:
			return 'nested Safe transactions'
		case ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND:
			return 'complex Safe nested multisend transactions'
		case ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND:
			return 'complex nested multisend transactions'
	}
}

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
 * ERC-7730 transaction decoding details for a single complex benchmark transaction.
 * ERC-7730 defines a standard for structured calldata descriptors that wallets use
 * to display human-readable descriptions of smart contract calls.
 */
export interface Erc7730TransactionDetails {
	/**
	 * Whether the calldata is decoded into a human-readable description
	 * using ERC-7730 structured calldata descriptors.
	 */
	decoded: DataDisplayOptions
}

/**
 * ERC-7730 support for software wallets.
 * Tracks whether the wallet can show human-readable descriptions for
 * each complex benchmark transaction.
 */
export type SoftwareWalletErc7730 = Record<
	ComplexBenchmarkTransactions,
	Erc7730TransactionDetails | null
>

/**
 * Simulation entry for a transaction that tracks the outcome explanation.
 */
export interface TransactionOutcomeEntry {
	transactionOutcome: TransactionOutcome
}

/**
 * Simulation entry for a transaction that may fail.
 */
export interface SimulatedFailedTransaction {
	failure: 'DETECTED' | 'NOT_DETECTED'
}

/**
 * Simulation entry for a transaction with nondeterministic outcome.
 */
export interface SimulatedNondeterministicTransaction {
	nondeterminism:
		| 'NO_OUTCOME_SHOWN'
		| 'STATIC_SINGLE_OUTCOME'
		| 'RESIMULATES_NO_WARNING'
		| 'RESIMULATES_WITH_WARNING'
}

/**
 * All benchmark transactions for which simulation can track a transaction outcome.
 */
export type TransactionSimulationsBenchmark =
	BasicBenchmarkTransactions | ComplexBenchmarkTransactions

/**
 * Per-benchmark-transaction simulation data for software wallets.
 * All basic and complex benchmark transactions track transactionOutcome;
 * simulation-specific benchmarks track failure detection and nondeterminism handling.
 */
export type SoftwareTransactionSimulations = Record<
	TransactionSimulationsBenchmark,
	TransactionOutcomeEntry | null
> & {
	[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: SimulatedFailedTransaction | null
	[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: SimulatedNondeterministicTransaction | null
}

/** Returns true if the entry's outcome is fully explained, null if entry is null. */
export function isTransactionOutcomeExplained(
	entry: TransactionOutcomeEntry | null,
): boolean | null {
	if (entry === null) {
		return null
	}

	return entry.transactionOutcome === TransactionOutcome.EXPLAINED
}

/** Returns true if the entry's calldata was decoded and shown, null if entry is null. */
export function isTransactionDecoded(
	entry: { decoded: DataDisplayOptions } | null,
): boolean | null {
	if (entry === null) {
		return null
	}

	return (
		entry.decoded === DataDisplayOptions.SHOWN_BY_DEFAULT ||
		entry.decoded === DataDisplayOptions.SHOWN_OPTIONALLY
	)
}

/**
 * Global transaction details display for software wallets.
 * These basic fields are expected to be shown across all transaction types.
 */
export interface SoftwareTransactionDetailsDisplay {
	gas: DataDisplayOptions
	nonce: DataDisplayOptions
	from: DataDisplayOptions
	to: DataDisplayOptions
	chain: DataDisplayOptions
	value: DataDisplayOptions
}

/**
 * Where does the calldata decoding actually happen?
 * To identify: initiate a contract transaction and observe whether the
 * decoded output appears on the hardware wallet's own screen, or only in
 * the companion app / browser extension on the computer.
 */
export enum DataLocation {
	/**
	 * Decoding happens on the hardware wallet device itself.
	 * The decoded function name and parameters are shown on the device screen,
	 * independently of any software running on the connected computer.
	 */
	ON_DEVICE = 'ON_DEVICE',

	/**
	 * Decoding happens off-device — in a companion app, browser extension, or
	 * desktop software. The hardware wallet's own screen does not show decoded data.
	 */
	OFF_DEVICE = 'OFF_DEVICE',

	/** No decoding occurs; raw hex calldata is shown (or nothing at all). */
	NOT_PROVIDED = 'NOT_PROVIDED',
}

/**
 * What does the wallet provide for message signing legibility?
 * To test: trigger an `eth_signTypedData_v4` request (e.g. via an app that
 * uses EIP-712 signatures, or via the browser console) and observe what the
 * wallet's approval screen shows.
 *
 * Users can test on https://beta.walletbeat.eth.limo/test and
 * test a EIP-712 message signing request under `Signatures` tab.
 */
export enum MessageSigningDetails {
	/**
	 * The wallet shows the full decoded EIP-712 struct — domain fields and
	 * message fields rendered as human-readable key-value pairs.
	 */
	EIP712_STRUCT = 'EIP712_STRUCT',

	/** The wallet shows the EIP-712 domain separator hash. */
	DOMAIN_HASH = 'DOMAIN_HASH',

	/** The wallet shows the EIP-712 message hash. */
	MESSAGE_HASH = 'MESSAGE_HASH',

	/**
	 * The wallet shows the EIP-712 digest: the final hash that gets signed:
	 * `"\x19\x01" || domainSeparator || hashStruct(message)`.
	 */
	EIP712_DIGEST = 'EIP712_DIGEST',
}

/**
 * For software wallets: track which message signing data types are available
 */
export type SoftwareMessageSigningLegibility = Record<
	MessageSigningDetails,
	DataDisplayOptions
> | null

/**
 * Data Extraction: how can a user independently verify the data shown on
 * a hardware wallet, beyond reading it with their eyes?
 *
 * IN FLUX: the industry has not yet standardized this.
 * https://ethereum-magicians.org/t/standardizing-wallet-information-so-humans-can-actually-know-what-they-are-signing/24295
 *
 * To identify: initiate a contract call and observe what the hardware wallet
 * offers beyond text display on the screen.
 */
export enum DataExtraction {
	/**
	 * The data is shown on screen and the user reads it visually.
	 * No machine-readable export is available.
	 */
	EYES = 'EYES',

	/**
	 * The device displays a QR code that encodes the transaction data,
	 * which can be scanned to extract and verify it externally.
	 */
	QRCODE = 'QRCODE',

	/**
	 * The device shows cryptographic hashes (e.g. domain hash, message hash)
	 * that the user can independently compute and compare.
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

export type HardwareWalletErc7730 = Record<ComplexBenchmarkTransactions, DataLocation | null>

export interface HardwareWalletErc8213 {
	calldataDisplay: Record<CallDataDisplay, DisplayCapability> | null

	messageSigningLegibility: Record<MessageSigningDetails, DisplayCapability> | null
}

type DisplayCapability = {
	display: DataDisplayOptions
	location: DataLocation
}

export interface BaseTransactionLegibilitySupport {
	/**
	 * ERC-4361 (Sign-In with Ethereum) support.
	 * Whether the wallet can clearly present Sign-In with Ethereum
	 * authentication requests to the user.
	 * The `ref` block should document ERC-4361 support specifically.
	 */
	erc4361: WithRef<Support> | null

	/**
	 * ERC-8123 (Wallet Signature and Calldata Digest Display)
	 * Whether the wallet follows the "Wallet Display Requirements"
	 * section of ERC-8123.
	 * The `ref` block should document ERC-8213 support specifically.
	 */
	erc8213: WithRef<Support> | null
}

/**
 * A record of transaction legibility support (both message and transaction)
 */
export interface HardwareTransactionLegibilitySupport extends BaseTransactionLegibilitySupport {
	erc8213: WithRef<Support<HardwareWalletErc8213>> | null
	erc7730: WithRef<Support<HardwareWalletErc7730>> | null
	/**
	 * Does a wallet display transaction details clearly?
	 */
	detailsDisplayed: DisplayedBasicTransactionDetails | null

	/**
	 * Does a wallet allow for data extraction?
	 */
	dataExtraction: DataExtractionMethods | null
}

/**
 * What can the user do with the calldata on the approval screen?
 * To test: initiate a contract transaction (e.g. USDC_APPROVAL) and check
 * what calldata options the wallet provides.
 *
 * Users can test on https://beta.walletbeat.eth.limo/test and
 * test a USDC approval transaction under `Transactions` tab.
 */
export enum CallDataDisplay {
	/**
	 * The raw `0x...` hex calldata is visible somewhere on the approval screen.
	 * To test: look for a hex string starting with `0x` on the approval screen
	 * or in an expandable section.
	 */
	RAW_HEX = 'RAW_HEX',
	/**
	 * A dedicated button copies the raw hex calldata to the clipboard.
	 * For batched transactions, the full hex including the multicall wrapper is expected.
	 * To test: look for a copy icon or "Copy" button next to the calldata.
	 */
	COPY_HEX_TO_CLIPBOARD = 'COPY_HEX_TO_CLIPBOARD',
	/**
	 * The calldata is decoded into a human-readable function name and arguments
	 * (e.g. JSON or structured text), not just raw hex.
	 * For batched transactions, each inner call should be decoded individually.
	 * To test: check if the wallet shows the function name (e.g. `approve`) and
	 * parameters (e.g. spender address, amount) in a readable format.
	 */
	FORMATTED = 'FORMATTED',
	/**
	 * The wallet shows the Calldata digest:
	 * keccak256(uint256(len) || calldata)
	 */
	CALLDATA_DIGEST = 'CALLDATA_DIGEST',
}

export const displaysFullCallData: Record<CallDataDisplay, DataDisplayOptions> = {
	[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
	[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_BY_DEFAULT,
	[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_BY_DEFAULT,
	[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
}

/**
 * ERC-8213 (Transaction Legibility) support for software wallets.
 * Tracks which calldata display formats and message signing data types
 * the wallet exposes to the user.
 */
export interface SoftwareWalletErc8213 {
	/** Which calldata display formats are available and how they are shown. */
	calldataDisplay: Record<CallDataDisplay, DataDisplayOptions> | null
	/** Which message signing data types are available and how they are shown. */
	messageSigningLegibility: SoftwareMessageSigningLegibility | null
}

/**
 * A record of transaction legibility support (both message and transaction)
 */
export interface SoftwareTransactionLegibilitySupport extends BaseTransactionLegibilitySupport {
	erc8213: WithRef<Support<SoftwareWalletErc8213>> | null

	/**
	 * ERC-7730 calldata decoding support per complex benchmark transaction.
	 * The `ref` block should document ERC-7730 support specifically.
	 */
	erc7730: WithRef<Support<SoftwareWalletErc7730>> | null

	/**
	 * Per-benchmark simulation data: transaction outcomes for token and complex transactions,
	 * plus failure/nondeterminism detection for simulation-specific benchmarks.
	 */
	transactionSimulations: Support<SoftwareTransactionSimulations> | null

	/**
	 * Global basic transaction details display (gas, nonce, from, to, chain, value).
	 * Applied across all transaction types.
	 */
	transactionDetailsDisplay: SoftwareTransactionDetailsDisplay | null
}

export const isShown = (field: DataDisplayOptions): boolean =>
	field === DataDisplayOptions.SHOWN_BY_DEFAULT || field === DataDisplayOptions.SHOWN_OPTIONALLY

/**
 * Whether a display entry is shown to the user.
 * Handles both the software wallet shape (a bare `DataDisplayOptions`) and
 * the hardware wallet shape (a `DisplayCapability` object).
 */
export function displayEntryIsShown(entry: DataDisplayOptions | DisplayCapability): boolean {
	return isShown(typeof entry === 'object' ? entry.display : entry)
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
 * Shorthand for a hardware wallet that decodes every complex benchmark
 * transaction on-device via ERC-7730.
 */
export const erc7730HardwareWalletFullySupported: HardwareWalletErc7730 = {
	[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
	[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.ON_DEVICE,
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
		DataLocation.ON_DEVICE,
	[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
		DataLocation.ON_DEVICE,
}

/**
 * Shorthand for a software wallet that decodes every complex benchmark
 * transaction via ERC-7730.
 */
export const erc7730SoftwareWalletFullySupported: SoftwareWalletErc7730 = {
	[ComplexBenchmarkTransactions.USDC_APPROVAL]: { decoded: DataDisplayOptions.SHOWN_BY_DEFAULT },
	[ComplexBenchmarkTransactions.AAVE_SUPPLY]: { decoded: DataDisplayOptions.SHOWN_BY_DEFAULT },
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
		decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
	},
	[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
		decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
	},
	[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
		decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
	},
}

/**
 * Shorthand for a hardware wallet that shows every ERC-8213 calldata display
 * option and message signing detail, all on-device.
 */
export const erc8213HardwareWalletFullySupported: HardwareWalletErc8213 = {
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
}

/**
 * Shorthand for a software wallet that shows every ERC-8213 calldata display
 * option and message signing detail.
 */
export const erc8213SoftwareWalletFullySupported: SoftwareWalletErc8213 = {
	calldataDisplay: displaysFullCallData,
	messageSigningLegibility: {
		[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
		[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
		[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
		[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
	},
}

/**
 * Type predicate for `HardwareTransactionLegibilityImplementation`.
 */
export function isHardwareTransactionLegibility(
	transactionLegibility:
		HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation,
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

/**
 * The merged references of the per-ERC ref blocks of a transaction
 * legibility record. The record's top-level `ref` documents the non-ERC
 * fields (transaction details display, simulations, data extraction);
 * each ERC block carries the references specific to that ERC.
 */
export function transactionLegibilityErcRefs(
	transactionLegibility:
		HardwareTransactionLegibilityImplementation | SoftwareTransactionLegibilityImplementation,
): FullyQualifiedReference[] {
	return mergeRefs(
		transactionLegibility.erc4361?.ref,
		transactionLegibility.erc7730?.ref,
		transactionLegibility.erc8213?.ref,
	)
}
