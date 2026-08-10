import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const fastly: CorporateEntity & InfrastructureProvider = {
	id: 'fastly',
	name: 'Fastly',
	legalName: { name: 'Fastly, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/fastly',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/fastly/',
	privacyPolicy: 'https://www.fastly.com/privacy',
	repoUrl: 'https://github.com/fastly',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.fastly.com/',
}
