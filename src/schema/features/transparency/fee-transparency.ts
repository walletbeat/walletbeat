import type { WithRef } from '@/schema/reference'

/**
 * Types of fee transparency levels
 */
export enum FeeTransparencyLevel {
	/**
	 * No fee transparency
	 */
	NONE = 'NONE',

	/**
	 * Basic fee information shown
	 */
	BASIC = 'BASIC',

	/**
	 * Detailed breakdown of network fees
	 */
	DETAILED = 'DETAILED',

	/**
	 * Full transparency of all fees including wallet fees
	 */
	COMPREHENSIVE = 'COMPREHENSIVE',
}

/**
 * Details about wallet's fee transparency implementation
 */
export type FeeTransparencySupport = WithRef<{
	/**
	 * The level of fee transparency provided by the wallet
	 */
	level: FeeTransparencyLevel

	/**
	 * Whether the wallet clearly discloses any additional fees it charges
	 */
	disclosesWalletFees: boolean

	/**
	 * Whether transaction purpose/reason is clearly displayed
	 */
	showsTransactionPurpose: boolean

	/**
	 * Additional details about the fee transparency implementation
	 */
	details?: string
}>
