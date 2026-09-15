import type { SecurityAuditor } from '@/schema/entity'

export const trailOfBits: SecurityAuditor = {
	id: 'trail-of-bits',
	name: 'Trail of Bits',
	legalName: { name: 'Trail of Bits, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'US',
	linkedin: 'https://www.linkedin.com/company/trail-of-bits/',
	privacyPolicy: 'https://www.trailofbits.com/privacy-policy',
	repoUrl: 'https://github.com/trailofbits',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.trailofbits.com/',
}
