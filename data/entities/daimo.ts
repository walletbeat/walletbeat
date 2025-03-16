import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const daimoInc: CorporateEntity & WalletDeveloper = {
	id: 'daimo',
	name: 'Daimo',
	legalName: { name: 'Daimo, Inc', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	url: 'https://daimo.com/',
	privacyPolicy: 'https://daimo.com/privacy',
	crunchbase: 'https://www.crunchbase.com/organization/daimo',
}
