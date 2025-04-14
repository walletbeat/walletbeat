import type {
	ChainDataProvider,
	CorporateEntity,
	OffchainDataProvider,
	TransactionBroadcastProvider,
	WalletDeveloper,
} from '@/schema/entity'

export const ambireEntity: OffchainDataProvider &
	WalletDeveloper &
	ChainDataProvider &
	CorporateEntity &
	TransactionBroadcastProvider = {
	id: 'ambire',
	name: 'Ambire Wallet',
	legalName: { name: 'Ambire Tech Ltd.', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: true,
	},
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Bulgaria',
	url: 'https://ambire.com/',
	repoUrl: 'https://github.com/AmbireTech',
	privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20%2826%20November%202021%29.pdf',
	crunchbase: 'https://www.crunchbase.com/organization/adex-03c2',
	linkedin: 'https://www.linkedin.com/company/ambiretech',
	twitter: 'https://x.com/ambireWallet',
	farcaster: 'https://warpcast.com/ambirewallet',
}
