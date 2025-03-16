import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const certora: CorporateEntity & SecurityAuditor = {
	id: 'certora',
	name: 'Certora',
	legalName: { name: 'Certora Inc.', soundsDifferent: false },
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
	jurisdiction: 'Israel',
	url: 'https://www.certora.com/',
	privacyPolicy: null,
	crunchbase: 'https://www.crunchbase.com/organization/certora',
} 