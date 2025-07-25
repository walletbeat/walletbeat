import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const ackee: CorporateEntity & SecurityAuditor = {
	id: 'ackee',
	name: 'Ackee',
	legalName: { name: 'Ackee', soundsDifferent: false },
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
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'GLOBAL',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://ackee.xyz/privacy-policy',
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/ackee_xyz',
	url: 'https://ackee.xyz/',
}
