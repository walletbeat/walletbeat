import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity'

export const gelato: CorporateEntity & TransactionBroadcastProvider = {
	id: 'gelato',
	name: 'Gelato',
	legalName: { name: 'Gelato Network AG', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/gelato-network',
	farcaster: 'https://warpcast.com/gelato',
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Switzerland',
	linkedin: 'https://www.linkedin.com/company/gelato-network/',
	privacyPolicy: 'https://www.gelato.network/privacy-policy',
	repoUrl: 'https://github.com/gelatodigital',
	twitter: 'https://x.com/gelatonetwork',
	url: 'https://www.gelato.network/',
}
