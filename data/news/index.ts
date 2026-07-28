import type { WalletSecurityNews } from '@/types/content/news'

/**
 * All news articles about wallet security incidents, sorted by date (newest first)
 * Compiled from individual news files
 */
export const allWalletSecurityNews: WalletSecurityNews[] = [
	(await import('./2022-08-11-slope-wallet-sentry-seed-phrase-leak')).default,
	(await import('./2025-12-25-browser-extension-v268-incident')).default,
	(await import('./2026-01-06-global-e-breach')).default,
	(await import('./2026-05-20-bankrbot-hack')).default,
	(await import('./2026-06-03-tropic01-secure-element-fault-injection')).default,
	(await import('./2026-07-17-consensys-metamask-north-korean-hacker')).default,
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

/**
 * Get security news items for a specific wallet, sorted chronologically (newest first).
 *
 * @param walletId - The wallet ID to filter news for
 * @returns Array of WalletSecurityNews items affecting the given wallet
 */
export function getNewsForWallet(walletId: string): WalletSecurityNews[] {
	return allWalletSecurityNews.filter(news => news.wallets.includes(walletId))
}
