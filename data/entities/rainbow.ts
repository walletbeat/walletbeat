import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const rainbow: CorporateEntity & WalletDeveloper = {
	id: 'rainbow',
	name: 'Rainbow',
	legalName: { name: 'Rainbow', soundsDifferent: false },
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
	farcaster: 'https://farcaster.xyz/rainbow',
	icon: 'NO_ICON',
	jurisdiction: 'United States',
	privacyPolicy: 'https://rainbow.me/privacy',
	repoUrl: 'https://github.com/rainbow-me',
	twitter: 'https://x.com/rainbowdotme',
	url: 'https://rainbow.me/',
}
