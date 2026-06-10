import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'tropic01-secure-element-fault-injection',
	type: NewsType.VULNERABILITY,
	ref: [
		{
			label: 'Laser Fault Injection on TROPIC01 report by Ledger Donjon',
			url: 'https://donjon.ledger.com/blog/tropic01-laser-fault-injection/',
		},
		{
			label: 'Statement by Trezor on TROPIC01 chip vulnerability',
			url: 'https://trezor.io/learn/security-privacy/how-trezor-keeps-you-safe/tropic-01-chip-vulnerability-disclosure-what-happened',
		},
	],
	impact: {
		category: ImpactCategory.OTHER,
		fundsImpacted: false,
	},
	publishedAt: '2026-06-03',
	severity: Severity.LOW,
	status: IncidentStatus.ONGOING,
	summary:
		"Laser fault injection found by Ledger's Donjon security team on the TROPIC01 secure element, used by Trezor Safe 7 devices. This does not amount to a full compromise of Trezor devices.",
	title: 'Fault found in TROPIC01 secure element in Trezor Safe 7 devices',
	updatedAt: '2026-06-03',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
