import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const coinbase: CorporateEntity & WalletDeveloper = {
	id: 'coinbase',
	name: 'Coinbase',
	legalName: { name: 'Coinbase Global, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/coinbase',
	farcaster: 'https://warpcast.com/coinbase',
	icon: { extension: 'svg' },
	jurisdiction: 'USA',
	linkedin: 'https://www.linkedin.com/company/coinbase/',
	privacyPolicy: 'https://wallet.coinbase.com/dapp-privacy-policy',
	repoUrl: 'https://github.com/coinbase',
	twitter: 'https://x.com/coinbase',
	url: 'https://www.coinbase.com/',
}
