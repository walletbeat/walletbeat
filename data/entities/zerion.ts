import type { ChainDataProvider, CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const zerion: CorporateEntity & ChainDataProvider & OffchainDataProvider = {
	id: 'zerion',
	name: 'Zerion',
	legalName: { name: 'Zerion Inc', soundsDifferent: false },
	type: {
		chainDataProvider: true,
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
	jurisdiction: 'Delaware, United States',
	linkedin: 'https://www.linkedin.com/company/zeriontech/',
	privacyPolicy: 'https://zerion.io/privacy-policy',
	repoUrl: 'https://github.com/zeriontech',
	twitter: 'https://x.com/zerion',
	url: 'https://zerion.io/',
}
