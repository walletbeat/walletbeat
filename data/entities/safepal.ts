import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const safepal: CorporateEntity & WalletDeveloper = {
	id: 'safepal',
	name: 'SafePal',
	legalName: { name: 'SkyGenesis Holdings Limited', soundsDifferent: true },
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
	crunchbase: 'https://www.crunchbase.com/organization/safepal-c6bc',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/14504410',
	privacyPolicy: 'https://www.safepal.com/en/about/privacy',
	repoUrl: 'https://github.com/SafePalWallet',
	twitter: 'https://x.com/SafePal',
	url: 'https://www.safepal.com/',
}
