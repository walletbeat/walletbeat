import type { SecurityAuditor } from '@/schema/entity'

export const pashov: SecurityAuditor = {
	id: 'pashov-audit-group',
	name: 'Pashov Audit Group',
	// @TODO
	legalName: { name: 'Pashov Audit Group', soundsDifferent: false },
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
	url: 'https://www.pashov.net/',
	repoUrl: 'https://github.com/pashov/audits',
	// @TODO
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: 'https://www.crunchbase.com/person/krum-krasimirov-pashov',
	linkedin: 'https://www.linkedin.com/in/krum-krasimirov-pashov/',
	twitter: 'https://x.com/pashovkrum',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
