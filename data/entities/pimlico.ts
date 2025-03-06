import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity'

export const pimlico: CorporateEntity & TransactionBroadcastProvider = {
	id: 'pimlico',
	name: 'Pimlico',
	legalName: { name: 'Austerlitz Labs Ltd', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	icon: {
		extension: 'png',
		width: 200,
		height: 200,
	},
	jurisdiction: 'London, England, United Kingdom',
	url: 'https://www.pimlico.io/',
	privacyPolicy: 'https://www.pimlico.io/privacy',
	crunchbase: 'https://www.crunchbase.com/organization/pimlico',
}
