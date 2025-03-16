import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const firefly: CorporateEntity & WalletDeveloper = {
	id: 'firefly',
	name: 'Firefly',
	legalName: { name: 'Firefly', soundsDifferent: false },
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
	jurisdiction: '',
	url: 'https://firefly.city/',
	repoUrl: 'https://github.com/firefly',
	privacyPolicy: '',
	crunchbase: '',
	linkedin: '',
	twitter: 'https://x.com/FireflyPocket',
} 