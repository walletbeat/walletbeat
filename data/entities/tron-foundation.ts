import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const tronFoundation: CorporateEntity & ChainDataProvider = {
	id: 'tronFoundation',
	name: 'TRON Foundation',
	legalName: { name: 'TRON Foundation', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/tron-foundation',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Singapore',
	linkedin: 'https://www.linkedin.com/company/tron-foundation',
	privacyPolicy: 'https://tron.network/privacy',
	repoUrl: 'https://github.com/tronprotocol',
	twitter: 'https://x.com/trondao',
	url: 'https://tron.network/',
}
