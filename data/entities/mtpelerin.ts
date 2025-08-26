import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const mtpelerin: CorporateEntity & WalletDeveloper = {
	id: 'mtpelerin',
	name: 'Mt Pelerin',
	legalName: { name: 'Mt Pelerin Group SA', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/mt-pelerin',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Switzerland',
	privacyPolicy: 'https://www.mtpelerin.com/privacy-policy',
	repoUrl: 'https://github.com/mtpelerin',
	linkedin: 'https://www.linkedin.com/company/mt-pelerin/',
	twitter: 'https://x.com/intent/user?screen_name=mtpelerin',
	url: 'https://www.mtpelerin.com/',
}
