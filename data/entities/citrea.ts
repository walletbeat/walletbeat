import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const citrea: CorporateEntity & ChainDataProvider = {
	id: 'citrea',
	name: 'Citrea',
	legalName: { name: 'Chainway Labs', soundsDifferent: true },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
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
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/chainwayxyz',
	twitter: 'https://x.com/citrea_xyz',
	url: 'https://citrea.xyz/',
}
