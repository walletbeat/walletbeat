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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: 'https://warpcast.com/firefly',
	icon: {
		extension: 'svg',
	},
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/firefly',
	twitter: 'https://x.com/FireflyPocket',
	url: 'https://firefly.city/',
};
