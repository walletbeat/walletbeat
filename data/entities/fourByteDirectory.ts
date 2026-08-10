import type { OffchainDataProvider } from '@/schema/entity'

export const fourByteDirectory: OffchainDataProvider = {
	id: 'fourByteDirectory',
	name: '4byte.directory',
	legalName: 'NOT_A_LEGAL_ENTITY',
	type: {
		chainDataProvider: false,
		corporate: false,
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
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/ethereum-lists',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.4byte.directory/',
}
