import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const alchemy: CorporateEntity & ChainDataProvider = {
	id: 'alchemy',
	name: 'Alchemy',
	legalName: { name: 'Alchemy Insights, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Delaware, United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.alchemy.com/privacy-policy',
	repoUrl: 'https://github.com/alchemyplatform',
	twitter: 'https://x.com/AlchemyPlatform',
	url: 'https://www.alchemy.com/',
}
