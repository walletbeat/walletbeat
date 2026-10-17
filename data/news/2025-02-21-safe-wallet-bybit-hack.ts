import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'safe-wallet-bybit-hack',
	type: NewsType.HACK,
	ref: [
		{
			label: 'Safe Ecosystem Foundation: Statement on the Bybit incident',
			url: 'https://safefoundation.org/blog/safe-ecosystem-foundation-statement',
		},
		{
			label:
				'FBI public service announcement: North Korea Responsible for 1.5 Billion USD Bybit Hack',
			url: 'https://www.ic3.gov/PSA/2025/PSA250226',
		},
	],
	impact: {
		category: ImpactCategory.SUPPLY_CHAIN,
		fundsImpacted: true,
	},
	publishedAt: '2025-02-21',
	severity: Severity.CRITICAL,
	status: IncidentStatus.RESOLVED,
	summary:
		"Attackers compromised a Safe{Wallet} developer's machine and used it to serve a disguised malicious transaction to the signers of Bybit's Ethereum cold wallet, a Safe multisig. Once signed, the transaction handed control of the wallet to the attackers, who stole about 1.5 billion USD in assets. The FBI attributed the theft to North Korea. Safe said external forensic review found no vulnerabilities in the Safe smart contracts or in the source code of its frontend and services. Safe rebuilt its infrastructure, rotated all credentials and restored Safe{Wallet} on Ethereum mainnet in a phased rollout.",
	title: 'Compromised Safe{Wallet} Developer Machine Leads to 1.5 Billion USD Bybit Hack',
	updatedAt: '2025-02-28',
	wallets: ['safe'],
} as const satisfies WalletSecurityNews
