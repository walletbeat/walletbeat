import type { WithRef } from '@/schema/reference';

/**
 * Basic Transaction Details
 * - gas
 * - nonce
 * - from
 * - to
 * - chain
 * - value
 */
export enum ShowsTransactionDetails {
  NONE = 'NONE',
  SOME = 'SOME', // Some of the stuff above
  FULL = 'FULL', // All of the stuff above
}

/**
 * Calldata decoding
 *
 * Does a wallet decode calldata natively?
 *
 * Note: There are "packed" operations that get a pass for now.
 * However, in the future, packed operations like MultiSend, will be required for
 * the "NESTED" rating.
 *
 * If a wallet nested decodes calldata, but not in EIP-712 messages, it gets "basic"
 *
 * Note: Right now, one level of nested decoded calldata is acceptable, however
 * in the future, recursive nested calldata decoding will be required
 */
export enum CalldataDecoding {
  NONE = 'NONE',
  BASIC = 'BASIC',
  NESTED = 'NESTED',
}

/**
 * Calldata Extraction:
 *
 * How is a user able to extract that data from a hardware
 * wallet, in order to verify the information?
 */
export enum CalldataExtraction {
  NONE = 'NONE', // Does not show calldata
  EYES = 'EYES', // Shows calldata, but users have to look at it with their eyes
  QRCODE = 'QRCODE', // Shows calldata, and a QR code to extract
  HASHES = 'HASHES', // Shows calldata, and a group of hashes to compare against
}

/**
 * Message Signing
 *
 * How is a user able to verify the message they are about to sign?
 */
export enum MessageExtraction {
  NONE = 'NONE', // Does not show message information
  EYES = 'EYES', // Shows EIP-712 message struct, and raw message data, but users have to see with their eyes
  QRCODE = 'QRCODE', // Shows message data, and a QR code to extract
  HASHES = 'HASHES', // Shows message data, and EIP-712 hashes
}

/**
 * A record of hardware wallet message signing support
 */
export interface MessageSigningSupport {
  /**
   * How is a user able to verify the message they are about to sign?
   */
  extraction: MessageExtraction | null;
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
  showsTransactionDetails: ShowsTransactionDetails | null;
  /**
   * Does a wallet decode calldata natively?
   */
  calldataDecoding: CalldataDecoding | null;
  /**
   * How is a user able to extract calldata from a hardware wallet?
   */
  calldataExtraction: CalldataExtraction | null;
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
