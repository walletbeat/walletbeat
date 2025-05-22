import type { CorporateEntity } from '@/schema/entity';

export const merkleManufactory: CorporateEntity = {
	id: 'merkle-manufactory',
	name: 'Merkle Manufactory',
	legalName: { name: 'Merkle Manufactory Inc', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/merkle-manufactory',
	farcaster: 'https://warpcast.com/farcaster',
	icon: 'NO_ICON',
	jurisdiction: 'Los Angeles, California, United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/farcasterxyz',
	twitter: 'https://x.com/farcaster_xyz',
	url: 'https://merklemanufactory.com/',
};
