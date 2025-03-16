import type { CorporateEntity, WalletDeveloper } from '@/schema/entity';

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
	jurisdiction: { type: 'UNKNOWN' },
	url: 'https://firefly.city/',
	repoUrl: 'https://github.com/firefly',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	twitter: 'https://x.com/FireflyPocket',
};
