import type { WalletSecurityNews } from '@/types/content/news'

/**
 * All news articles about wallet security incidents, sorted by date (newest first)
 * Compiled from individual news files
 */
export const allWalletSecurityNews: WalletSecurityNews[] = [
	(await import('./2025-12-25-browser-extension-v268-incident')).default,
	(await import('./2026-01-06-global-e-breach')).default,
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
