import {
	IncidentStatus,
	ImpactCategory,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export const browserExtensionIncident: WalletSecurityNews = {
	name: 'browser-extension-v268-incident',
	type: NewsType.HACK,
	severity: Severity.CRITICAL,
	title: 'Trust Wallet Browser Extension v2.68 Supply Chain Attack',
	summary:
		'A malicious version of Trust Wallet Browser Extension (v2.68) was published to the Chrome Web Store on December 24, 2025, through a compromised API key. The attack, linked to the industry-wide Sha1-Hulud supply chain incident, affected users who logged in during December 24-26, 2025. Approximately 2,520 wallet addresses were impacted with $8.5M in losses. Trust Wallet has committed to reimbursing all affected users.',
	impact: {
		fundsImpacted: true,
		category: ImpactCategory.SUPPLY_CHAIN,
	},
	status: IncidentStatus.ONGOING,
	publishedAt: '2025-12-25',
	updatedAt: '2026-01-06',
	ref: {
		url: 'https://trustwallet.com/blog/announcements/trust-wallet-browser-extension-v268-incident-community-update',
		label: 'Trust Wallet Browser Extension v2.68 Incident: Community Update',
	},
}

export const trustWalletNewsRegistry = {
	'browser-extension-v268-incident': browserExtensionIncident,
} as const