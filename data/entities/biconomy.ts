import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity'

export const biconomy: CorporateEntity & TransactionBroadcastProvider = {
	id: 'biconomy',
	name: 'Biconomy',
	legalName: { name: 'Biconomy Labs', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	icon: {
		extension: 'png',
		width: 200,
		height: 200,
	},
	jurisdiction: 'UNKNOWN',
	url: 'https://www.biconomy.io/',
	repoUrl: 'https://github.com/bcnmy',
	privacyPolicy: 'https://biconomy.zendesk.com/hc/en-us/articles/360036040012-Privacy-policy',
	crunchbase: 'https://www.crunchbase.com/organization/biconomy',
	linkedin: 'https://www.linkedin.com/company/biconomy/',
	twitter: 'https://x.com/biconomy',
	farcaster: 'https://warpcast.com/biconomy',
}
