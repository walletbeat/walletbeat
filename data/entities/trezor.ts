import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const trezor: CorporateEntity & WalletDeveloper = {
	id: 'trezor',
	name: 'Trezor',
	legalName: { name: 'SatoshiLabs s.r.o.', soundsDifferent: true },
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
	jurisdiction: 'Czech Republic',
	url: 'https://trezor.io/',
	privacyPolicy: 'https://trezor.io/privacy-policy',
	crunchbase: 'https://www.crunchbase.com/organization/trezor',
	linkedin: 'https://www.linkedin.com/company/trezor-by-satoshilabs/',
	twitter: 'https://x.com/trezor',
} 