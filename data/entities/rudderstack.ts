import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const rudderstack: CorporateEntity & InfrastructureProvider = {
	id: 'rudderstack',
	name: 'RudderStack',
	legalName: { name: 'RudderStack, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: true,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/rudderstack',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/rudderlabs/',
	privacyPolicy: 'https://www.rudderstack.com/privacy-policy/',
	repoUrl: 'https://github.com/rudderlabs',
	twitter: 'https://x.com/rudderstack',
	url: 'https://www.rudderstack.com/',
}
