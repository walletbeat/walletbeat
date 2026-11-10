import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'trezor-support-portal-breach',
	type: NewsType.DATA_BREACH,
	ref: {
		label: 'Trezor blog: Trezor security alert: Stay vigilant against a potential phishing attack',
		url: 'https://blog.trezor.io/trezor-security-update-stay-vigilant-against-potential-phishing-attack-bb05015a21f8',
	},
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2024-01-17',
	severity: Severity.MEDIUM,
	status: IncidentStatus.RESOLVED,
	summary:
		'On 2024-01-17, Trezor identified unauthorized access to the support ticketing portal it uses, which is run by an external provider. The names or nicknames and email addresses of up to 66,000 people who had contacted Trezor Support since December 2021 may have been accessed. The attacker emailed 41 of them asking for their recovery seeds; Trezor alerted each of them and said no recovery seeds were disclosed. Trezor devices and user funds were not affected.',
	title: 'Trezor Support Portal Breach Exposes Contact Details of up to 66,000 Users',
	updatedAt: '2024-01-19',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
