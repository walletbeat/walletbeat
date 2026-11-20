import type { WalletDeveloper } from '@/schema/entity'

/** The person who publishes 1337. There is no separate company. */
export const wallet1337: WalletDeveloper = {
	id: 'wallet1337',
	name: '1337',
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
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://1337wallet.io/privacy',
	repoUrl: 'https://github.com/0xCardiE',
	twitter: 'https://x.com/1337wallet',
	url: 'https://1337wallet.io/',
}
