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
	crunchbase: 'https://www.crunchbase.com/organization/aiprise',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Unknown',
	linkedin: 'https://www.linkedin.com/company/aiprise-inc/',
	privacyPolicy: 'https://aiprise.com/privacy-policy',
	repoUrl: 'https://github.com/aiprise',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://aiprise.com',
}
