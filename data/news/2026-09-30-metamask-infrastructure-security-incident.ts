import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'metamask-infrastructure-security-incident',
	type: NewsType.INCIDENT,
	ref: [
		{
			label: 'MetaMask: User update',
			url: 'https://metamask.io/news/user-update',
		},
		{
			label: 'MetaMask on X: Security update',
			url: 'https://x.com/MetaMask/status/2105442300335620460',
		},
	],
	impact: {
		category: ImpactCategory.OTHER,
		fundsImpacted: false,
	},
	publishedAt: '2026-09-30',
	severity: Severity.MEDIUM,
	status: IncidentStatus.ONGOING,
	summary:
		"MetaMask disclosed a security incident affecting part of its infrastructure. As a precaution, it is exiting the affected validators in its non-custodial staking operations, in coordination with clients and partners; MetaMask does not hold its staking clients' withdrawal keys. MetaMask states that its investigation has found no indication that MetaMask wallets or customer funds were affected, and that the investigation is ongoing.",
	title: 'MetaMask Infrastructure Security Incident Prompts Staking Validator Exits',
	updatedAt: '2026-10-01',
	wallets: ['metamask'],
} as const satisfies WalletSecurityNews
