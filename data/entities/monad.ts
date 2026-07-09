import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const monad: CorporateEntity & ChainDataProvider = {
	id: 'monad',
	name: 'Monad',
	legalName: { name: 'Monad Labs', soundsDifferent: false },
	type: {
		chainDataProvider: true,
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
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/monad_xyz',
	url: 'https://www.monad.xyz/',
}
