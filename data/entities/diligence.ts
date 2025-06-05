import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const diligence: CorporateEntity & SecurityAuditor = {
	id: 'diligence',
	name: 'diligence',
	legalName: { name: 'diligence', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/consensus-systems',
	farcaster: 'https://warpcast.com/consensys',
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://consensys.io/privacy-notice',
	repoUrl: 'https://github.com/Consensys',
	twitter: 'https://x.com/ConsensysAudits',
	url: 'https://diligence.consensys.io/',
}
