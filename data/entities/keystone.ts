import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

export const keystone: CorporateEntity & WalletDeveloper = {
	id: 'keystone',
	name: 'Keystone',
	legalName: { name: 'Yanssie HK Limited', soundsDifferent: true },
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
	jurisdiction: 'Hong Kong',
	url: 'https://keyst.one/',
	repoUrl: 'https://github.com/KeystoneHQ',
	privacyPolicy: 'https://keyst.one/privacy-policy',
	linkedin: 'https://www.linkedin.com/company/keystonehardwarewallet/',
	twitter: 'https://x.com/KeystoneWallet',
	crunchbase: 'https://www.crunchbase.com/organization/kesytone',
	farcaster: 'https://warpcast.com/keystonewallet',
};
