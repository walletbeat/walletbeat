import type { ChainDataProvider, OffchainDataProvider } from '@/schema/entity'

export const lifi: ChainDataProvider & OffchainDataProvider = {
	id: 'lifi',
	name: 'LiFi',
	legalName: { name: 'LI.FI Service GmbH', soundsDifferent: true },
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
	url: 'https://li.fi/',
	repoUrl: 'https://github.com/lifinance',
	privacyPolicy: 'https://li.fi/legal/privacy-policy/',
	crunchbase: 'https://www.crunchbase.com/organization/li-finance-fbae',
	linkedin: 'https://www.linkedin.com/company/lifiprotocol/',
	twitter: 'https://x.com/lifiprotocol',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
