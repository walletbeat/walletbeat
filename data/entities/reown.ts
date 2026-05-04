import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const reown: CorporateEntity & OffchainDataProvider = {
	id: 'reown',
	name: 'Reown',
	legalName: { name: 'WalletConnect Inc.', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/walletconnect',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'UNKNOWN',
	linkedin: 'https://www.linkedin.com/company/walletconnect',
	privacyPolicy: 'https://reown.com/privacy-policy',
	repoUrl: 'https://github.com/reown-com',
	twitter: 'https://x.com/reown_',
	url: 'https://reown.com/',
}
