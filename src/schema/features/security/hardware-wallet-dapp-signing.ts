import type { WithRef } from '@/schema/reference'

/**
 * Types of clear signing support levels
 */
export enum DappSigningLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  PARTIAL = 'PARTIAL',
  FULL = 'FULL'
}

/**
 * A record of hardware wallet types and their clear signing support level
 */
export interface HardwareWalletDappSigningSupport  {
	/**
	 * The level of clear signing support
	 */
	level: DappSigningLevel
	/**
	 * Additional details about the clear signing implementation
	 */
	details?: string
}

export type HardwareWalletDappSigningImplementation = WithRef<HardwareWalletDappSigningSupport> 