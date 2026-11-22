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
	ref: [
		{
			label: 'Fluidkey on X: Update on security incident',
			url: 'https://x.com/fluidkey/status/2123510970165436704',
		},
		{
			label: 'Fluidkey on X: Back online with v1.79.22',
			url: 'https://x.com/fluidkey/status/2123811285934506413',
		},
	],
	impact: {
		category: ImpactCategory.SUPPLY_CHAIN,
		fundsImpacted: true,
	},
	publishedAt: '2026-11-19',
	severity: Severity.HIGH,
	status: IncidentStatus.MITIGATED,
	summary:
		'Fluidkey, an onchain privacy wallet, disclosed a security incident and took all services offline at 18:05 UTC on 2026-11-19, advising users not to interact with its website and app during the investigation. Fluidkey attributed the incident to flaws in an external logging tool. The attacker obtained session data, prepared unauthorized transfers on its servers, and had them signed when a user opened the app. The private keys controlling user funds never left the device. Fluidkey returned online with v1.79.22 on web, iOS, and Android, blocking all previous versions until users update, and is working with SEAL 911 on the investigation and tracing of funds.',
	title: 'Fluidkey Security Incident',
	updatedAt: '2026-11-20',
	wallets: [],
} as const satisfies WalletSecurityNews
