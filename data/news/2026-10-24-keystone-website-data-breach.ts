import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'keystone-website-data-breach',
	type: NewsType.DATA_BREACH,
	ref: {
		label: 'Keystone on X: Customer shipping information obtained in website incident',
		url: 'https://x.com/KeystoneWallet/status/2114054080754770137',
	},
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-10-24',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		'Keystone detected unauthorized access to its official website on October 20 and confirmed on October 23, after verifying API activity with Shopify, that an external actor had obtained customer shipping information. Exposed data includes names, contact details, shipping addresses, and order details. Payment card or bank details, recovery phrases, private keys, and wallet passwords were not exposed. Keystone said it blocked access, fixed the vulnerability, opened an investigation, and is emailing affected customers.',
	title: 'Customer Shipping Information Exposed in Keystone Website Incident',
	updatedAt: '2026-10-24',
	wallets: ['keystone'],
} as const satisfies WalletSecurityNews
