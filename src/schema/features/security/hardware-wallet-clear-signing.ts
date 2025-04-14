import { type WithRef } from '@/schema/reference'

/**
 * Types of clear signing support levels
 */
export enum ClearSigningLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  PARTIAL = 'PARTIAL',
  FULL = 'FULL'
}

/**
 * A record of hardware wallet types and their clear signing support level
 */
export type HardwareWalletClearSigningSupport = WithRef<{
	/**
	 * The level of clear signing support
	 */
	level: ClearSigningLevel
	/**
	 * Additional details about the clear signing implementation
	 */
	details?: string
}> 