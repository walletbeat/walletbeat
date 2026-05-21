import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'bankrbot-hack',
	type: NewsType.HACK,
	ref: {
		label: 'Bankr wallets compromised, transactions disabled while investigating',
		url: 'https://x.com/bankrbot/status/2056764771488436320',
	},
	impact: {
		category: ImpactCategory.OTHER,
		fundsImpacted: true,
	},
	publishedAt: '2026-05-20',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		'BankrBot reported that several users had their wallets compromised and drained. The root cause and full scope of the breach have not yet been disclosed. Transactions have been disabled as a precautionary measure while the team investigates.',
	title: 'Bankr Users Report Wallets Being Drained in Active Security Incident',
	updatedAt: '2026-05-20',
	wallets: [],
} as const satisfies WalletSecurityNews
