import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const veyrnoxEntity: WalletDeveloper & CorporateEntity = {
	id: 'veyrnox',
	name: 'VEYRNOX',
	legalName: { name: 'VEYRNOX LTD', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: 'https://www.crunchbase.com/organization/veyrnox',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'png',
		height: 512,
		width: 512,
	},
	jurisdiction: 'United Kingdom',
	linkedin: 'https://www.linkedin.com/company/veyrnoxwallet',
	privacyPolicy: 'https://veyrnox.com/privacy',
	repoUrl: 'https://github.com/veyrnox',
	twitter: 'https://x.com/VeyrnoxWallet',
	url: 'https://veyrnox.com/',
}
