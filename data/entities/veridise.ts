import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const veridise: CorporateEntity & SecurityAuditor = {
	id: 'veridise',
	name: 'Veridise',
	legalName: { name: 'Veridise Inc', soundsDifferent: false },
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
		extension: 'svg',
	},
	jurisdiction: 'Austin, Texas, United States',
	url: 'https://veridise.com/',
	privacyPolicy: 'https://veridise.com/privacy-policy/',
	crunchbase: 'https://www.crunchbase.com/organization/veridise',
}
