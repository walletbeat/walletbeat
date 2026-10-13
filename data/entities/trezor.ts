import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const trezor: CorporateEntity & WalletDeveloper = {
	id: 'trezor',
	name: 'Trezor',
	legalName: { name: 'Trezor Company s.r.o.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/trezor',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Czech Republic',
	linkedin: 'https://www.linkedin.com/company/trezor/',
	privacyPolicy: 'https://data.trezor.io/legal/privacy-policy.html',
	repoUrl: 'https://github.com/trezor',
	twitter: 'https://x.com/trezor',
	url: 'https://trezor.io/',
}
