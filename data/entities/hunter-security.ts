import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

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
	// @TODO
	icon: {
		extension: 'svg',
	},
	jurisdiction: { type: 'UNKNOWN' },
	url: 'https://www.huntersec.co/',
	repoUrl: 'https://github.com/GeorgeHNTR',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	twitter: 'https://x.com/HunterBlockSec',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
