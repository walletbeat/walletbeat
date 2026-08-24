import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'trezor-shipmonk-data-breach',
	type: NewsType.DATA_BREACH,
	ref: [
		{
			label: 'Trezor blog: Recent customer data exposed in shipping provider incident',
			url: 'https://trezor.io/blog/news/recent-customer-data-exposed-in-shipping-provider-incident',
		},
		{
			label: 'Trezor on X: Customer data exposure incident',
			url: 'https://x.com/Trezor/status/2087885428313543059',
		},
	],
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-08-13',
	severity: Severity.HIGH,
	status: IncidentStatus.MITIGATED,
	summary:
		"ShipMonk, an independent shipping provider for Trezor, experienced a data breach that exposed customer personal information including full names, shipping addresses, phone numbers, and email addresses. 13,689 customers were affected, with exposure limited by Trezor's 90-day data retention policy. Trezor's own systems were not compromised and its devices remain secure, but affected customers may face an increase in phishing attempts and wrench attacks.",
	title: 'Customer Data Exposed in Trezor Shipping Provider Incident',
	updatedAt: '2026-08-13',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
