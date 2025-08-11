import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const nufi: CorporateEntity & WalletDeveloper = {
	id: 'nufi',
	name: 'NuFi',
	legalName: { name: 'NuFi AG', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/nufi-fdfb',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Switzerland',
	linkedin: 'https://www.linkedin.com/company/nufiwallet',
	privacyPolicy: 'https://nu.fi/privacy-and-cookies-policy',
	repoUrl: 'https://github.com/nufi-official/nufi',
	twitter: 'https://x.com/nufiwallet',
	url: 'https://nu.fi',
}
