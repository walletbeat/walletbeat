import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const coingecko: CorporateEntity & OffchainDataProvider = {
	id: 'coingecko',
	name: 'CoinGecko',
	legalName: { name: 'Gecko Labs Pte. Ltd.', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/coingecko',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Singapore',
	linkedin: 'https://www.linkedin.com/company/coingecko/',
	privacyPolicy: 'https://www.coingecko.com/en/privacy',
	repoUrl: 'https://github.com/coingecko',
	twitter: 'https://x.com/coingecko',
	url: 'https://www.coingecko.com/',
}
