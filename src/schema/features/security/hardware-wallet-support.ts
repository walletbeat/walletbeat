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
 * A record of hardware wallet types and their support status
 */
export type HardwareWalletSupport = WithRef<{
	/**
	 * Record of hardware wallet types and their support status
	 */
	supportedWallets: Partial<Record<HardwareWalletType, Support>>
}>
