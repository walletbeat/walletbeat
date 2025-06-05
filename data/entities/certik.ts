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
	crunchbase: 'https://www.crunchbase.com/organization/certik',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	// @TODO
	icon: {
		extension: 'svg',
	},
	// @TODO
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/certik',
	// @TODO
	privacyPolicy: 'https://www.certik.com/company/privacy-policy',
	repoUrl: 'https://github.com/CertiKProject',
	twitter: 'https://x.com/CertiK',
	url: 'https://www.certik.com/',
}
