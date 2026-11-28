import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'trezor-skladon-data-breach',
	type: NewsType.DATA_BREACH,
	ref: [
		{
			label: 'Trezor blog: Data breach at Trezor shipping partner, Skladon',
			url: 'https://trezor.io/blog/news/data-breach-at-trezor-shipping-partner-skladon',
		},
		{
			label: 'Trezor on X: Data breach involving Skladon',
			url: 'https://x.com/Trezor/status/2122363569891135655',
		},
	],
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-11-16',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		'Skladon, a shipping partner for Trezor, experienced a data breach on 7 November 2026 in which an attacker gained unauthorized access to Trezor order data. The exposed data covers approximately 27,000 orders placed between 9 August and 7 November 2026 and includes full names, phone numbers, delivery addresses, email addresses, and order details. Trezor systems were not compromised and no wallet backups or passphrases were involved, but affected customers face an elevated risk of phishing and physical-security threats.',
	title: 'Customer Data Exposed in Trezor Shipping Partner Skladon Breach',
	updatedAt: '2026-11-16',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
