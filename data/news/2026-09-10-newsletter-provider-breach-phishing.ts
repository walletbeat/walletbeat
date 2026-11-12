import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'newsletter-provider-breach-phishing',
	type: NewsType.INCIDENT,
	ref: [
		{
			label: 'Trezor on X: External e-mail provider breach used for phishing',
			url: 'https://x.com/Trezor/status/2097786518110609620',
		},
		{
			label: 'BitBox on X: Newsletter provider compromise used for phishing',
			url: 'https://x.com/BitBoxSwiss/status/2097793026336981079',
		},
	],
	impact: {
		category: ImpactCategory.PHISHING_RELATED,
		fundsImpacted: false,
	},
	publishedAt: '2026-09-10',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		"A shared newsletter/e-mail provider used by multiple Bitcoin hardware wallet companies was compromised, letting attackers send phishing e-mails from the companies' legitimate domains. Trezor warned that an e-mail titled 'Critical Security Alert: STM32 Entropy Vulnerability' did not originate from them and took down the compromised domain. BitBox confirmed a phishing e-mail was sent to its newsletter subscribers about an hour earlier and, after preliminary review, found it very likely that the shared newsletter provider was compromised, noting multiple other Bitcoin companies were targeted as well. Both companies warned their subscribers, contacted the provider, and reported the phishing domains; most phishing links have since been taken down. Both are still investigating.",
	title: 'Shared Newsletter Provider Breach Used for Phishing Against Trezor and BitBox',
	updatedAt: '2026-09-10',
	wallets: ['trezor', 'bitbox'],
} as const satisfies WalletSecurityNews
