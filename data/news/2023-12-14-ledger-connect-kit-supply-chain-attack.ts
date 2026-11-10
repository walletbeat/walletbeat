import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'ledger-connect-kit-supply-chain-attack',
	type: NewsType.HACK,
	ref: [
		{
			label: 'Ledger: Security Incident Report',
			url: 'https://www.ledger.com/blog/security-incident-report',
		},
		{
			label: 'Ledger: Letter from the Ledger CEO regarding the Ledger Connect Kit exploit',
			url: 'https://www.ledger.com/blog/a-letter-from-ledger-chairman-ceo-pascal-gauthier-regarding-ledger-connect-kit-exploit',
		},
		{
			label: 'Revoke.cash: Ledger Connect Kit Hack',
			url: 'https://revoke.cash/exploits/ledger-connect-kit',
		},
	],
	impact: {
		category: ImpactCategory.SUPPLY_CHAIN,
		fundsImpacted: true,
	},
	publishedAt: '2023-12-14',
	severity: Severity.MEDIUM,
	status: IncidentStatus.RESOLVED,
	summary:
		"An attacker phished a former Ledger employee whose access to Ledger's npm account had not been revoked, and published malicious versions 1.1.5 to 1.1.7 of Ledger Connect Kit, a JavaScript library used by apps to connect to Ledger devices. Apps loading the library showed users fake transaction requests that drained their wallets for less than two hours before Ledger replaced the package. Revoke.cash estimates about 610,000 USD was stolen across several EVM chains. Ledger devices and Ledger Live were not affected.",
	title: 'Ledger Connect Kit Supply Chain Attack Drains Wallets via Connected Apps',
	updatedAt: '2023-12-20',
	wallets: ['ledger'],
} as const satisfies WalletSecurityNews
