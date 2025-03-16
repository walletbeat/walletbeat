import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const cure53: CorporateEntity & SecurityAuditor = {
	id: 'cure53',
	name: 'Cure53',
	legalName: { name: 'Cure53', soundsDifferent: false },
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
		width: 137,
		height: 136,
	},
	jurisdiction: 'Berlin, Germany',
	url: 'https://cure53.de/',
	privacyPolicy: 'https://cure53.de/datenschutz.php',
	crunchbase: 'https://www.crunchbase.com/organization/cure53',
}
