import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const leastAuthority: CorporateEntity & SecurityAuditor = {
	id: 'least-authority',
	name: 'Least Authority',
	legalName: { name: 'Least Authority', soundsDifferent: false },
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
		width: 1246,
		height: 1043,
	},
	jurisdiction: 'Berlin, Germany',
	url: 'https://leastauthority.com/',
	privacyPolicy: 'https://leastauthority.com/privacy-policy/',
	crunchbase: 'https://www.crunchbase.com/organization/least-authority-enterprises',
}
