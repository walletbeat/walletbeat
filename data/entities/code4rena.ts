import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const code4rena: CorporateEntity & SecurityAuditor = {
	id: 'code4rena',
	name: 'Code4rena',
	legalName: { name: 'Code4rena', soundsDifferent: false },
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
	url: 'https://code4rena.com/',
	privacyPolicy: null,
	crunchbase: 'https://www.crunchbase.com/organization/code4rena',
} 