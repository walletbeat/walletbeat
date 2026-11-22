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
			label: 'Fluidkey: Incident report for 19 November 2026',
			url: 'https://docs.fluidkey.com/security/incident-2026-11-19/',
		},
		{
			label: 'SigNoz advisory: Unauthenticated trace analytics endpoints',
			url: 'https://github.com/SigNoz/signoz/security/advisories/GHSA-v549-7j2x-qjm5',
		},
		{
			label: 'SigNoz advisory: SQL injection in trace analytics',
			url: 'https://github.com/SigNoz/signoz/security/advisories/GHSA-w5pf-xwjh-vr5v',
		},
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
	status: IncidentStatus.RESOLVED,
	summary:
		"Fluidkey disclosed that an attacker made unauthorized transfers from 52 accounts between 17:28 and 18:05 UTC on 19 November 2026, stealing approximately $1.6 million. The attacker exploited two vulnerabilities in SigNoz, an external open-source logging tool that Fluidkey runs on its own servers, to read internal logs. The logs contained session tokens and viewing keys. The attacker used them to prepare and approve transfer requests on Fluidkey's servers and raise two-factor spending limits, and the transfers were signed when users opened and unlocked the app. Private keys never left users' devices. The logs also exposed personal data of 70 accounts, including email addresses, names, bank account numbers, postal addresses, dates of birth and phone numbers. Fluidkey returned online with v1.79.22, contacted affected users, and reported the incident to law enforcement.",
	title: 'Fluidkey Security Incident',
	updatedAt: '2026-11-22',
	wallets: [],
} as const satisfies WalletSecurityNews
