import type { ChainDataProvider, OffchainDataProvider } from '@/schema/entity'

export const jiffylabs: ChainDataProvider & OffchainDataProvider = {
	id: 'jiffylabs',
	name: 'Jiffy Labs',
	legalName: { name: 'Jiffy Labs', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	icon: {
		extension: 'png',
		width: 200,
		height: 200,
	},
	jurisdiction: 'UNKNOWN',
	url: 'https://jiffyscan.xyz/',
	repoUrl: 'https://github.com/jiffy-labs/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	linkedin: 'https://www.linkedin.com/company/jiffylabs/',
	twitter: 'https://x.com/JiffyScan',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
