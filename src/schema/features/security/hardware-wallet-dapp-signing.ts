import type { WithRef } from '@/schema/reference';

/**
 * What essential transaction data does the hardware wallet show? (Or can show via options)
 */
export interface DisplayedTransactionDetails {
    gas: boolean,
    nonce: boolean,
    from: boolean,
    to: boolean, 
    chain: boolean, 
    value: boolean
}

export const displaysNoTransactionDetails: DisplayedTransactionDetails = {
  gas: false,
  nonce: false,
  from: false,
  to: false,
  chain: false,
  value: false
}

export const displaysFullTransactionDetails: DisplayedTransactionDetails = {
  gas: true,
  nonce: true,
  from: true,
  to: true,
  chain: true,
  value: true
}

/**
 * Important: THIS INFORMATION MUST BE ON THE WALLET ITSELF. We do not trust the software "around" the wallets.
 * 
 * To judge this feature of calldata decoding, we will assess a "hard-and-fast" rule of "can you decode this specific set of calldata?"
 * Hardware wallets could "cheat" this system by hard-coding just these transactions to pass the test, so we expect this list to grow over time.
 * Additionally, calldata decoding might get more advanced over time, so this list may change.
 * 
 * None: No calldata decoding
 * ETH_USDC_TRANSFER: cast calldata "transfer(address,uint256)" 0x06496E706bB260Bef1656297A7eaDDF5D3E7788A 1000000000000000000
 * https://tools.cyfrin.io/abi-encoding?data=0xa9059cbb00000000000000000000000006496e706bb260bef1656297a7eaddf5d3e7788a0000000000000000000000000000000000000000000000000de0b6b3a7640000
 * 
 * ZKSYNC_USDC_TRANSFER: Same as above, but on different chains
 * 
 * AAVE_SUPPLY: cast calldata "supply(address,uint256,address,uint16)" 0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E 50000000000000000000 0x9467919138E36f0252886519f34a0f8016dDb3a3 0
 * https://tools.cyfrin.io/abi-encoding?data=0x617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000
 * 
 * SAFEWALLET_AAVE_SUPPLY_NESTED: 
 * https://tools.cyfrin.io/abi-encoding?data=0x6a76120200000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
 * 
 * SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND:
 * https://tools.cyfrin.io/abi-encoding?data=0x6a761202000000000000000000000000f220d3b4dfb23c4ade8c88e526c1353abacbc38f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000001c48d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000172005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b300000000000000000000000078e30497a3c7527d953c6b1e3541b021a98ac43c000000000000000000000000000000000000000000000002b5e3af16b18800000078e30497a3c7527d953c6b1e3541b021a98ac43c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084617ba0370000000000000000000000005a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041000000000000000000000000F8Cade19b26a2B970F2dEF5eA9ECcF1bda3d118600000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000
 *  
 */
export enum CalldataDecoding {
  NONE = 'NONE',
  ETH_USDC_TRANSFER = 'ETH_USDC_TRANSFER',
  ZKSYNC_USDC_TRANSFER = 'ZKSYNC_USDC_TRANSFER',
  AAVE_SUPPLY = 'AAVE_SUPPLY',
  SAFEWALLET_AAVE_SUPPLY_NESTED = 'SAFEWALLET_AAVE_SUPPLY_NESTED',
  SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND = 'SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND',
  // In the future, add decoding of L1 -> L2 messages like `sendToL1`
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
  NONE = 'NONE', // Does not show calldata/message data
  EYES = 'EYES', // Shows calldata/message data, but users have to look at it with their eyes
  QRCODE = 'QRCODE', // Shows calldata/message data, and a QR code to extract
  HASHES = 'HASHES', // Shows calldata/message data, and a group of hashes to compare against
}

/**
 * A record of hardware wallet message signing support
 */
export interface MessageSigningSupport {
  /**
   * How is a user able to verify the message they are about to sign?
   */
  messageExtraction: DataExtraction | null;
  /**
   * Does a wallet decode calldata natively within EIP-712 messages?
   */
  calldataDecoding: CalldataDecoding | null;
  /**
   * Additional details about the message signing implementation
   */
  details?: string;
}

/**
 * A record of hardware wallet transaction signing support
 */
export interface TransactionSigningSupport {
  /**
   * Basic transaction details displayed
   */
  displayedTransactionDetails: DisplayedTransactionDetails;
  /**
   * Does a wallet decode calldata natively?
   */
  calldataDecoding: CalldataDecoding | null;
  /**
   * How is a user able to extract calldata from a hardware wallet?
   */
  calldataExtraction: DataExtraction | null;
  /**
   * Additional details about the transaction signing implementation
   */
  details?: string;
}

/**
 * A record of hardware wallet dapp signing support (both message and transaction)
 */
export interface HardwareWalletDappSigningSupport {
  /**
   * Message signing support
   */
  messageSigning: MessageSigningSupport;
  /**
   * Transaction signing support
   */
  transactionSigning: TransactionSigningSupport;
}

export type MessageSigningImplementation = WithRef<MessageSigningSupport>;
export type TransactionSigningImplementation = WithRef<TransactionSigningSupport>;
export type HardwareWalletDappSigningImplementation = WithRef<HardwareWalletDappSigningSupport>;
