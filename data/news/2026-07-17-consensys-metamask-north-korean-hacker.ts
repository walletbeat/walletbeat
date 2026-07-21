import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'consensys-metamask-north-korean-hacker',
	type: NewsType.INCIDENT,
	ref: {
		label:
			'Drop Site News: Major Blockchain Firm Consensys Accidentally Hired a North Korean Hacker',
		url: 'https://www.dropsitenews.com/p/consensys-metamask-crypto-wallet-hired-north-korean-hacker',
	},
	impact: {
		category: ImpactCategory.VENDOR_INFILTRATION,
		fundsImpacted: false,
	},
	publishedAt: '2026-07-17',
	severity: Severity.LOW,
	status: IncidentStatus.RESOLVED,
	summary:
		'Consensys, creator of MetaMask, accidentally hired a North Korean-linked developer using the alias "Tyler Knapp" who worked as a consultant on core MetaMask platform code, including crypto-to-fiat conversion functionality. The actor contributed to MetaMask\'s mobile wallet for roughly a month (from March to April 2026) before access was terminated. Consensys\'s investigation confirmed that there was no misappropriation of assets or data, no malicious code deployed, and no impact to user safety and security.',
	title: 'Consensys (MetaMask) Accidentally Hired North Korean-Linked Developer',
	updatedAt: '2026-07-17',
	wallets: ['metamask'],
} as const satisfies WalletSecurityNews
