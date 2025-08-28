import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const ackee: CorporateEntity & SecurityAuditor = {
	id: 'ackee',
	name: 'Ackee',
	legalName: { name: 'Ackee Blockchain a.s.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/ackee-blockchain',
	farcaster: 'https://farcaster.xyz/ackee',
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'Prague, Czech Republic',
	linkedin: 'https://linkedin.com/company/ackee-blockchain',
	privacyPolicy: 'https://ackee.xyz/privacy-policy',
	repoUrl: 'https://github.com/Ackee-Blockchain',
	twitter: 'https://x.com/ackee_xyz',
	url: 'https://ackee.xyz/',
}
