import type { WalletDeveloper } from '@/schema/entity'

export const casberi: WalletDeveloper = {
	id: 'casberi',
	name: 'Casberi',
	legalName: 'NOT_A_LEGAL_ENTITY',
	type: {
		chainDataProvider: false,
		corporate: false,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: 'United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://casberi.app/privacy.html',
	repoUrl: 'https://github.com/alexanderchopan',
	twitter: 'https://x.com/casberi_app',
	url: 'https://casberi.app/',
}
