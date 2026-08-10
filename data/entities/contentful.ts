import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const contentful: CorporateEntity & OffchainDataProvider = {
	id: 'contentful',
	name: 'Contentful',
	legalName: { name: 'Contentful, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/contentful',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Berlin, Germany',
	linkedin: 'https://www.linkedin.com/company/contentful/',
	privacyPolicy: 'https://www.contentful.com/legal/privacy-at-contentful/privacy-notice/',
	repoUrl: 'https://github.com/contentful',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.contentful.com/',
}
