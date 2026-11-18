import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const goPlus: CorporateEntity & OffchainDataProvider = {
	id: 'goPlus',
	name: 'GoPlus Security',
	legalName: { name: 'GoPlus Security', soundsDifferent: false },
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
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/GoPlusSecurity',
	twitter: 'https://x.com/GoplusSecurity',
	url: 'https://gopluslabs.io/',
}
