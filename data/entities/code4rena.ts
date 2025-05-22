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
	crunchbase: 'https://www.crunchbase.com/organization/code4rena',
	farcaster: 'https://warpcast.com/code4rena',
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/code-423n4',
	twitter: 'https://x.com/code4rena',
	url: 'https://code4rena.com/',
};
