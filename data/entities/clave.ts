import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const claveEntity: CorporateEntity & WalletDeveloper = {
	id: 'clave',
	name: 'Clave',
	legalName: { name: 'Clave Technologies Ltd', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: 'https://warpcast.com/getclave',
	icon: { extension: 'png', height: 286, width: 286 },
	jurisdiction: 'United Kingdom',
	linkedin: 'https://www.linkedin.com/company/getclave/',
	privacyPolicy: 'https://www.getclave.com/privacy-policy',
	repoUrl: 'https://github.com/getclave',
	twitter: 'https://x.com/getclave',
	url: 'https://www.getclave.com',
}
