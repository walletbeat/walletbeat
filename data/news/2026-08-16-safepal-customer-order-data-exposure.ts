import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'safepal-customer-order-data-exposure',
	type: NewsType.DATA_BREACH,
	ref: [
		{
			label: 'SafePal blog: Unauthorized Access To A Subset Of Customer Order Information',
			url: 'https://www.safepal.com/en/blog/security-update',
		},
		{
			label: 'SafePal on X: Customer order information incident',
			url: 'https://x.com/SafePal/status/2088937173139812792',
		},
	],
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-08-16',
	severity: Severity.HIGH,
	status: IncidentStatus.MITIGATED,
	summary:
		'SafePal disclosed that an authorization flaw in its order-tracking plug-in allowed unauthorized access to the order information of 39,798 customers who placed orders between March 2, 2025 and April 11, 2026. Exposed data included names, email addresses, shipping addresses, phone numbers, and purchase details, but no seed phrases, private keys, wallet passwords, or wallet funds. Affected customers are at risk of targeted phishing/impersonation attempts and wrench attacks.',
	title: 'Unauthorized Access to SafePal Customer Order Information',
	updatedAt: '2026-08-16',
	wallets: [],
} as const satisfies WalletSecurityNews
