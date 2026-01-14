import type { WalletSecurityNews } from '@/types/content/news'

/**
 * All news articles about wallet security incidents, sorted by date (newest first)
 * Compiled from individual news files
 */
export const allWalletSecurityNews: WalletSecurityNews[] = [
	...Object.values((await import('./trust-wallet')).trustWalletRegistry),
	...Object.values((await import('./ledger')).ledgerNewsRegistry),
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
