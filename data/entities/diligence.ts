import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const diligence: CorporateEntity & SecurityAuditor = {
	id: 'diligence',
	name: 'diligence',
	legalName: { name: 'diligence', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	icon: {
		extension: 'png',
		width: 200,
		height: 200,
	},
	jurisdiction: 'United States',
	url: 'https://diligence.consensys.io/',
	repoUrl: 'https://github.com/Consensys',
	privacyPolicy: 'https://consensys.io/privacy-notice',
	crunchbase: 'https://www.crunchbase.com/organization/consensus-systems',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	twitter: 'https://x.com/ConsensysAudits',
	farcaster: 'https://warpcast.com/consensys',
};
