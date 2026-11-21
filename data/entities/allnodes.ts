import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const allnodes: CorporateEntity & ChainDataProvider = {
	id: 'allnodes',
	name: 'PublicNode',
	legalName: { name: 'Allnodes Inc.', soundsDifferent: true },
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
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.publicnode.com/privacy',
	repoUrl: 'https://github.com/allnodes',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.publicnode.com/',
}
