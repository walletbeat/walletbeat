import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const openExchangeRates: CorporateEntity & OffchainDataProvider = {
	id: 'open-exchange-rates',
	name: 'Open Exchange Rates',
	legalName: { name: 'Open Exchange Rates Ltd', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' }, // Unclear
	url: 'https://openexchangerates.org/',
	privacyPolicy: 'https://openexchangerates.org/privacy',
	crunchbase: 'https://www.crunchbase.com/organization/open-exchange-rates',
}
