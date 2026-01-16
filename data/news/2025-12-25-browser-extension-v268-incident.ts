import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'browser-extension-v268-incident',
	type: NewsType.HACK,
	ref: {
		label: 'Trust Wallet Browser Extension v2.68 Incident: Community Update',
		url: 'https://trustwallet.com/blog/announcements/trust-wallet-browser-extension-v268-incident-community-update',
	},
	impact: {
		category: ImpactCategory.SUPPLY_CHAIN,
		fundsImpacted: true,
	},
	publishedAt: '2025-12-25',
	severity: Severity.CRITICAL,
	status: IncidentStatus.MITIGATED,
	summary:
		'A malicious version of Trust Wallet Browser Extension (v2.68) was published to the Chrome Web Store on December 24, 2025, through a compromised API key. The attack, linked to the industry-wide Sha1-Hulud supply chain incident, affected users who logged in during December 24-26, 2025. Approximately 2,520 wallet addresses were impacted with $8.5M in losses. Trust Wallet has committed to reimbursing all affected users.',
	title: 'Trust Wallet Browser Extension v2.68 Supply Chain Attack',
	updatedAt: '2026-01-06',
} as const satisfies WalletSecurityNews