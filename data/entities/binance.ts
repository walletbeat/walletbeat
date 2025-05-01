import type { CorporateEntity, Exchange } from '@/schema/entity'

export const binance: CorporateEntity & Exchange = {
	id: 'binance',
	name: 'Binance',
	legalName: { name: 'Binance Holdings Ltd', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: true,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/binance',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Malta',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.binance.com/en/about-legal/privacy-portal',
	repoUrl: 'https://github.com/binance',
	twitter: 'https://x.com/binance',
	url: 'https://binance.com/',
}
