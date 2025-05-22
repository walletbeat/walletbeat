import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

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
	crunchbase: 'https://www.crunchbase.com/organization/trezor',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Czech Republic',
	linkedin: 'https://www.linkedin.com/company/trezor-by-satoshilabs/',
	privacyPolicy: 'https://trezor.io/privacy-policy',
	repoUrl: 'https://github.com/trezor',
	twitter: 'https://x.com/trezor',
	url: 'https://trezor.io/',
};
