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
		{
			label: 'Trezor on X: ShipMonk breach affects more customers than originally thought',
			url: 'https://x.com/Trezor/status/2095807665603584085',
		},
	],
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-08-13',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		"ShipMonk, an independent shipping provider for Trezor, experienced a data breach that exposed customer personal information including full names, shipping addresses, phone numbers, and email addresses. Trezor initially disclosed 13,689 affected customers, but a 2026-09-02 update revealed the breach was far larger: an additional 67,000 US customers who ordered between November 2019 and August 2021 had their full names, emails, phone numbers, shipping addresses, and order numbers exposed. Trezor said it had repeatedly obtained written assurance from ShipMonk that the data had been deleted per their contract, but it had not been. Trezor's own systems were not compromised and its devices remain secure, but affected customers may face an increase in phishing attempts and wrench attacks.",
	title: 'Customer Data Exposed in Trezor Shipping Provider Incident',
	updatedAt: '2026-09-02',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
