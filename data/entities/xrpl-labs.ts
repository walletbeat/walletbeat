import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const xrplLabs: CorporateEntity & ChainDataProvider = {
	id: 'xrplLabs',
	name: 'XRPL Labs',
	legalName: { name: 'XRPL Labs B.V.', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Netherlands',
	linkedin: 'https://www.linkedin.com/company/xrpl-labs',
	privacyPolicy: 'https://xrpl-labs.com/privacy',
	repoUrl: 'https://github.com/XRPL-Labs',
	twitter: 'https://x.com/XRPLLabs',
	url: 'https://xrpl-labs.com/',
}
