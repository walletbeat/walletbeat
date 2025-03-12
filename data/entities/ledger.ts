import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const ledger: CorporateEntity & WalletDeveloper = {
	id: 'ledger',
	name: 'Ledger',
	legalName: { name: 'Ledger SAS', soundsDifferent: false },
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
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'France',
	url: 'https://www.ledger.com/',
	privacyPolicy: 'https://shop.ledger.com/pages/privacy-policy',
	crunchbase: 'https://www.crunchbase.com/organization/ledger-2',
	linkedin: 'https://www.linkedin.com/company/ledgerhq/',
	twitter: 'https://x.com/Ledger',
} 