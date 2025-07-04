import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const aiprise: CorporateEntity & OffchainDataProvider = {
	id: 'aiprise',
	name: 'AiPrise',
	legalName: { name: 'AiPrise', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Unknown',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://aiprise.io/privacy-policy',
	repoUrl: 'https://github.com/aiprise',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://aiprise.io',
}
