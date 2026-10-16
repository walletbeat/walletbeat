import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity'

export const flashbots: CorporateEntity & TransactionBroadcastProvider = {
	id: 'flashbots',
	name: 'Flashbots',
	legalName: { name: 'Flashbots Ltd.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://docs.flashbots.net/policies/privacy',
	repoUrl: 'https://github.com/flashbots',
	twitter: {type: 'NO_TWITTER_URL'},
	url: 'https://www.flashbots.net/',
}
