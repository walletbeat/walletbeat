import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const zeusEntity: WalletDeveloper & CorporateEntity = {
	id: 'zeus',
	name: 'Zeus Wallet',
	legalName: { name: 'Zeus Wallet', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/greekfetacheese/zeus',
	twitter: { type: 'NO_TWITTER_URL' },
	url: { type: 'NO_WEBSITE' },
}
