import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const code4rena: CorporateEntity & SecurityAuditor = {
	id: 'code4rena',
	name: 'Code4rena',
	legalName: { name: 'Code4rena', soundsDifferent: false },
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
	url: 'https://code4rena.com/',
	repoUrl: 'https://github.com/code-423n4',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: 'https://www.crunchbase.com/organization/code4rena',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	twitter: 'https://x.com/code4rena',
	farcaster: 'https://warpcast.com/code4rena',
};
