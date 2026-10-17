import type { WalletDeveloper } from '@/schema/entity'

export const apoorvLathey: WalletDeveloper = {
	id: 'apoorvLathey',
	name: 'Apoorv Lathey',
	legalName: { name: 'Apoorv Lathey', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: false,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy:
		'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/PRIVACY_POLICY.md',
	repoUrl: 'https://github.com/apoorvlathey',
	twitter: 'https://x.com/apoorveth',
	url: 'https://apoorv.xyz',
}
