import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const uniswapLabs: CorporateEntity & WalletDeveloper = {
	id: 'uniswapLabs',
	name: 'Uniswap Labs',
	legalName: { name: 'Universal Navigation Inc.', soundsDifferent: true },
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
	crunchbase: 'https://www.crunchbase.com/organization/uniswap-labs',
	farcaster: 'https://farcaster.xyz/uniswap',
	icon: { extension: 'svg' },
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/uniswaporg/',
	privacyPolicy: 'https://uniswap.org/privacy-policy',
	repoUrl: 'https://github.com/Uniswap',
	twitter: 'https://x.com/Uniswap',
	url: 'https://uniswap.org/',
}
