import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const hunterSecurity: CorporateEntity & SecurityAuditor = {
	id: 'hunter-security',
	name: 'Hunter Security',
	legalName: { name: 'Hunter Security', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	// @TODO
	icon: {
		extension: 'svg',
	},
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/GeorgeHNTR',
	twitter: 'https://x.com/HunterBlockSec',
	url: 'https://www.huntersec.co/',
};
