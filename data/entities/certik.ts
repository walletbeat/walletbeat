import type { SecurityAuditor } from '@/schema/entity'

export const certik: SecurityAuditor = {
	id: 'certik',
	name: 'Certik',
	// @TODO
	legalName: { name: 'Certik', soundsDifferent: false },
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
	url: 'https://www.certik.com/',
	repoUrl: 'https://github.com/CertiKProject',
	// @TODO
	privacyPolicy: 'https://www.certik.com/company/privacy-policy',
	crunchbase: 'https://www.crunchbase.com/organization/certik',
	linkedin: 'https://www.linkedin.com/company/certik',
	twitter: 'https://x.com/CertiK',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
