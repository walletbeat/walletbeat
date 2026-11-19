import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const oathEntity: CorporateEntity & WalletDeveloper = {
	id: 'oath',
	name: 'Oath Wallet',
	legalName: { name: 'STAGE AND STYLE COLLECTIVE LLC', soundsDifferent: true },
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
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://oathwallet.org/privacy',
	repoUrl: 'https://github.com/devdasx',
	twitter: 'https://x.com/OathWallet',
	url: 'https://oathwallet.org/',
}
