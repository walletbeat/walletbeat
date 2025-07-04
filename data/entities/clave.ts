import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const claveEntity: CorporateEntity & WalletDeveloper = {
	id: 'clave',
	name: 'Clave',
	legalName: { name: 'Clave Technologies Ltd.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/clave-de99',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'United Kingdom',
	linkedin: 'https://www.linkedin.com/company/getclave/',
	privacyPolicy: 'https://www.getclave.com/privacy-policy',
	repoUrl: 'https://github.com/getclave/clave-contracts',
	twitter: 'https://x.com/getclave',
	url: 'https://www.getclave.com',
}
