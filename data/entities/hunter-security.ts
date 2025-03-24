import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const hunterSecurity: SecurityAuditor = {
	id: 'hunter-security',
	name: 'Hunter Security',
	// @TODO
	legalName: { name: 'Hunter Security Ltd', soundsDifferent: false },
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
	// @TODO
	jurisdiction: { type: 'UNKNOWN' },
	url: 'https://www.huntersec.co/',
	repoUrl: null,
	// @TODO
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: null,
	linkedin: null,
	twitter: 'https://x.com/HunterBlockSec',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
