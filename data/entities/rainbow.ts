import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const rainbow: CorporateEntity & WalletDeveloper = {
	id: 'rainbow',
	name: 'Rainbow',
	legalName: { name: 'Rainbow Studio, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/rainbow-ddab',
	farcaster: 'https://farcaster.xyz/rainbow',
	icon: {
		extension: 'png',
		height: 1024,
		width: 1024,
	},
	jurisdiction: 'New York, United States',
	linkedin: 'https://linkedin.com/company/rainbow-wallet',
	privacyPolicy: 'https://rainbow.me/privacy',
	repoUrl: 'https://github.com/rainbow-me',
	twitter: 'https://x.com/rainbowdotme',
	url: 'https://rainbow.me',
}
