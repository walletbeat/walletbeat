import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const gridplus: CorporateEntity & WalletDeveloper = {
	id: 'gridplus',
	name: 'GridPlus',
	legalName: { name: 'Grid+ Inc.', soundsDifferent: false },
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
	url: 'https://gridplus.io/',
	repoUrl: 'https://github.com/GridPlus',
	privacyPolicy: 'https://gridplus.io/policies/privacy-policy',
	linkedin: 'https://www.linkedin.com/company/gridplus/',
	twitter: 'https://x.com/gridplus',
	crunchbase: 'https://www.crunchbase.com/organization/gridplus',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
