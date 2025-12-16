import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
	WalletDeveloper,
} from '@/schema/entity'

export const consensys: ChainDataProvider &
	CorporateEntity &
	TransactionBroadcastProvider &
	WalletDeveloper = {
	id: 'consensys',
	name: 'Consensys',
	legalName: { name: 'ConsenSys Software Inc', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: true,
	},
	crunchbase: 'https://www.crunchbase.com/organization/consensus-systems',
	farcaster: 'https://farcaster.xyz/consensys',
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/consensys-software-inc',
	privacyPolicy: 'https://consensys.io/privacy-notice',
	repoUrl: 'https://github.com/consensys',
	twitter: 'https://x.com/consensys',
	url: 'https://consensys.io/',
}
