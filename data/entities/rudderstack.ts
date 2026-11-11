import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const rudderstack: CorporateEntity & OffchainDataProvider = {
	id: 'rudderstack',
	name: 'RudderStack',
	legalName: { name: 'RudderStack, Inc.', soundsDifferent: false },
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
	crunchbase: {
		type: 'NO_CRUNCHBASE_URL',
	},
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/rudderlabs/',
	privacyPolicy: 'https://www.rudderstack.com/privacy-policy/',
	repoUrl: 'https://github.com/rudderlabs',
	twitter: 'https://x.com/RudderStack',
	url: 'https://www.rudderstack.com/',
}
