import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const perpetuaLabs: CorporateEntity & WalletDeveloper = {
	id: 'perpetuaLabs',
	name: 'Perpetua Labs',
	legalName: { name: 'Perpetua Labs LLC', soundsDifferent: false },
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
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://cryptograph.watch/privacy',
	repoUrl: 'https://github.com/perpetua-engineering',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://cryptograph.watch/',
}
