import type { WalletSecurityNews } from '@/types/content/news'

import krakenTrezorVoltageGlitchSeedExtraction from './2020-01-31-kraken-trezor-voltage-glitch-seed-extraction'
import ledgerECommerceDatabaseBreach from './2020-07-29-ledger-e-commerce-database-breach'
import demonicMetamaskSeedPhraseOnDisk from './2022-06-15-demonic-metamask-seed-phrase-on-disk'
import slopeWalletSentrySeedPhraseLeak from './2022-08-11-slope-wallet-sentry-seed-phrase-leak'
import ledgerConnectKitSupplyChainAttack from './2023-12-14-ledger-connect-kit-supply-chain-attack'
import trezorSupportPortalBreach from './2024-01-17-trezor-support-portal-breach'
import safeWalletBybitHack from './2025-02-21-safe-wallet-bybit-hack'
import browserExtensionV268Incident from './2025-12-25-browser-extension-v268-incident'
import globalEBreach from './2026-01-06-global-e-breach'
import bankrbotHack from './2026-05-20-bankrbot-hack'
import tropic01SecureElementFaultInjection from './2026-06-03-tropic01-secure-element-fault-injection'
import consensysMetamaskNorthKoreanHacker from './2026-07-17-consensys-metamask-north-korean-hacker'
import coldcardMk3SeedGeneration from './2026-07-30-coldcard-mk3-seed-generation'
import privyMetabaseSecurityIncident from './2026-08-06-privy-metabase-security-incident'
import trezorShipmonkDataBreach from './2026-08-13-trezor-shipmonk-data-breach'
import safepalCustomerOrderDataExposure from './2026-08-16-safepal-customer-order-data-exposure'
import bitboxDixenceFirmwareVulnerabilities from './2026-08-17-bitbox-dixence-firmware-vulnerabilities'
import rabbySilentSignatureExtraction from './2026-08-19-rabby-silent-signature-extraction'
import newsletterProviderBreachPhishing from './2026-09-10-newsletter-provider-breach-phishing'
import payyBridgeExploit from './2026-09-24-payy-bridge-exploit'
import metamaskInfrastructureSecurityIncident from './2026-09-30-metamask-infrastructure-security-incident'

/**
 * All news articles about wallet security incidents, sorted by date (newest first)
 * Compiled from individual news files
 */
export const allWalletSecurityNews: WalletSecurityNews[] = [
	krakenTrezorVoltageGlitchSeedExtraction,
	ledgerECommerceDatabaseBreach,
	demonicMetamaskSeedPhraseOnDisk,
	slopeWalletSentrySeedPhraseLeak,
	ledgerConnectKitSupplyChainAttack,
	trezorSupportPortalBreach,
	safeWalletBybitHack,
	browserExtensionV268Incident,
	globalEBreach,
	bankrbotHack,
	tropic01SecureElementFaultInjection,
	consensysMetamaskNorthKoreanHacker,
	coldcardMk3SeedGeneration,
	privyMetabaseSecurityIncident,
	trezorShipmonkDataBreach,
	safepalCustomerOrderDataExposure,
	bitboxDixenceFirmwareVulnerabilities,
	rabbySilentSignatureExtraction,
	newsletterProviderBreachPhishing,
	payyBridgeExploit,
	metamaskInfrastructureSecurityIncident,
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
