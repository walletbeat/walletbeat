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
	crunchbase: 'https://www.crunchbase.com/organization/gridplus',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/gridplus/',
	privacyPolicy: 'https://gridplus.io/policies/privacy-policy',
	repoUrl: 'https://github.com/GridPlus',
	twitter: 'https://x.com/gridplus',
	url: 'https://gridplus.io/',
}
