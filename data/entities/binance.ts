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
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Malta',
	url: 'https://binance.com/',
	privacyPolicy: 'https://www.binance.com/en/about-legal/privacy-portal',
	crunchbase: 'https://www.crunchbase.com/organization/binance',
}
