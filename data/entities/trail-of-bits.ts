import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const trailofbits: CorporateEntity & SecurityAuditor = {
	id: 'trail-of-bits',
	name: 'Trail of Bits',
	legalName: { name: 'Trail of Bits, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/trail-of-bits',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/trailofbits/',
	privacyPolicy: 'https://www.trailofbits.com/privacy-policy',
	repoUrl: 'https://github.com/trailofbits',
	twitter: 'https://x.com/trailofbits',
	url: 'https://www.trailofbits.com/',
}
