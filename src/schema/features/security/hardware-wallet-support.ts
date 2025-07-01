import type { Support } from '@/schema/features/support'
import type { WithRef } from '@/schema/reference'
import type { NonEmptyRecord } from '@/types/utils/non-empty'

/**
 * Types of hardware wallets that can be supported
 */
export enum HardwareWalletType {
	LEDGER = 'LEDGER',
	TREZOR = 'TREZOR',
	GRIDPLUS = 'GRIDPLUS',
	KEYSTONE = 'KEYSTONE',
	KEEPKEY = 'KEEPKEY',
	FIREFLY = 'FIREFLY',
	OTHER = 'OTHER',
}

/**
 * Connection method between software and hardware wallet.
 */
export enum HardwareWalletConnection {
	USB = 'USB', // only for Desktop app with native USB
	QR = 'QR_based',
	webUSB = 'WEBUSB',
	webHID = 'WEBHID',
	bluetooth = 'BLUETOOTH',
	WALLET_CONNECT = 'WALLET_CONNECT',
}

/**
 * Set of connection types that are supported for a single hardware wallet.
 */
export type SingleHardwareWalletSupport = NonEmptyRecord<HardwareWalletConnection, Support>

/**
 * A record of hardware wallet types and their support status
 */
export type HardwareWalletSupport = WithRef<{
	/**
	 * Record of hardware wallet types and their support status
	 */
	supportedWallets: Partial<Record<HardwareWalletType, Support<SingleHardwareWalletSupport>>>
}>
