import { ledgerNewsRegistry } from './ledger'
import { trustWalletNewsRegistry } from './trust-wallet'

/**
 * Registry of all security news items about wallets
 * Compiled from wallet-specific news registries
 */
export const newsRegistry = {
	...ledgerNewsRegistry,
	...trustWalletNewsRegistry,
} as const
