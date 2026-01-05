import { ledgerNewsRegistry } from './ledger'

/**
 * Registry of all security news items about wallets
 * Compiled from wallet-specific news registries
 */
export const newsRegistry = {
	...ledgerNewsRegistry,
} as const