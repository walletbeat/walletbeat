import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'fluidkey-security-incident',
	type: NewsType.HACK,
	ref: {
		label: 'Fluidkey on X: Update on security incident',
		url: 'https://x.com/fluidkey/status/2123510970165436704',
	},
	impact: {
		category: ImpactCategory.OTHER,
		fundsImpacted: true,
	},
	publishedAt: '2026-11-19',
	severity: Severity.HIGH,
	status: IncidentStatus.ONGOING,
	summary:
		'Fluidkey, an onchain privacy wallet, disclosed a security incident affecting its users and advised them not to interact with its website and app during the investigation. The team took all services offline at 18:05 UTC and reported no unauthorized transactions since then. Fluidkey is working with SEAL 911 to investigate the incident and trace funds, and its web app and all APIs remain paused until the review is complete. Users in replies reported their wallets being drained.',
	title: 'Fluidkey Security Incident',
	updatedAt: '2026-11-19',
	wallets: [],
} as const satisfies WalletSecurityNews
