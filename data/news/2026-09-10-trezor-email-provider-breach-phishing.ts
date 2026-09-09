import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'trezor-email-provider-breach-phishing',
	type: NewsType.INCIDENT,
	ref: {
		label: 'Trezor on X: External e-mail provider breach used for phishing',
		url: 'https://x.com/Trezor/status/2097786518110609620',
	},
	impact: {
		category: ImpactCategory.PHISHING_RELATED,
		fundsImpacted: false,
	},
	publishedAt: '2026-09-10',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		"Trezor disclosed that its external e-mail provider was breached, allowing attackers to send phishing e-mails from Trezor's legitimate domain. The phishing e-mail, titled 'Critical Security Alert: STM32 Entropy Vulnerability', did not originate from Trezor. Trezor took down the compromised domain and is investigating how the attackers gained access to it.",
	title: 'Trezor Warns of Phishing E-mails Sent via Breached External E-mail Provider',
	updatedAt: '2026-09-10',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
