import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
	WalletDeveloper,
} from '@/schema/entity'

export const deBank: ChainDataProvider &
	CorporateEntity &
	TransactionBroadcastProvider &
	WalletDeveloper = {
	id: 'debank',
	name: 'DeBank',
	legalName: { name: 'DeBank Global PTE Ltd', soundsDifferent: false },
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
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Singapore',
	url: 'https://debank.com/',
	privacyPolicy: 'https://rabby.io/docs/privacy/',
	crunchbase: 'https://www.crunchbase.com/organization/debank',
}
