import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const segment: CorporateEntity & OffchainDataProvider = {
	id: 'segment',
	name: 'Segment',
	legalName: { name: 'Twilio Inc.', soundsDifferent: true },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.twilio.com/en-us/legal/privacy',
	repoUrl: 'https://github.com/segmentio',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.twilio.com/en-us',
}
