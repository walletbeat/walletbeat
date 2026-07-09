import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const gemEntity: WalletDeveloper & CorporateEntity = {
	id: 'gemwallet',
	name: 'Gem Wallet',
	legalName: { name: 'Gem Wallet', soundsDifferent: false },
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
	icon: {
		extension: 'svg',
	},
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://gemwallet.com/privacy',
	repoUrl: 'https://github.com/gemwalletcom',
	twitter: 'https://x.com/GemWalletApp',
	url: 'https://gemwallet.com/',
}
