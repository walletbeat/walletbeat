import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'privy-metabase-security-incident',
	type: NewsType.DATA_BREACH,
	ref: {
		label: 'Privy Blog: Post mortem on August 6th, 2026 Metabase security incident',
		url: 'https://privy.dev/blog/post-mortem-on-august-6-2026-metabase-security-incident',
	},
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-08-06',
	severity: Severity.MEDIUM,
	status: IncidentStatus.RESOLVED,
	summary:
		'Privy disclosed a security incident affecting Metabase, an external analytics and customer support provider it uses. The attacker gained access to customer and end-user email addresses and a small subset of developer-set custom metadata fields. Privy wallet infrastructure and authentication systems were not affected, with wallet infrastructure run on separate hardware. Privy suspended connections from Metabase, rotated connection credentials, and notified affected customers. Because email addresses were involved, the incident may increase the risk of phishing and targeted social engineering.',
	title: 'Privy Data Breach via Metabase Service Provider',
	updatedAt: '2026-08-10',
	wallets: [],
} as const satisfies WalletSecurityNews
