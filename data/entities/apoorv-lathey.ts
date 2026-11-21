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
	farcaster: 'https://farcaster.xyz/apoorvlathey',
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/in/apoorvlathey/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/apoorvlathey',
	twitter: 'https://x.com/apoorveth',
	url: 'https://apoorv.xyz',
}
