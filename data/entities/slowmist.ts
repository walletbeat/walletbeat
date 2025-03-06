import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const slowMist: CorporateEntity & SecurityAuditor = {
	id: 'slowmist',
	name: 'SlowMist',
	legalName: { name: 'SlowMist Ltd', soundsDifferent: false },
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
		width: 375,
		height: 375,
	},
	jurisdiction: 'China',
	url: 'https://www.slowmist.com/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: 'https://www.crunchbase.com/organization/slowmist',
}
