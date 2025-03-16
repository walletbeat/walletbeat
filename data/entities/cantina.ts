import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const cantina: CorporateEntity & SecurityAuditor = {
	id: 'cantina',
	name: 'Cantina',
	legalName: { name: 'Cantina Consulting', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	icon: {
		extension: 'png',
		width: 200,
		height: 200,
	},
	jurisdiction: 'United States',
	url: 'https://cantina.xyz/',
	privacyPolicy: null,
	crunchbase: null,
} 