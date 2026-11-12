import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const quicknode: CorporateEntity & ChainDataProvider = {
	id: 'quicknode',
	name: 'QuickNode',
	legalName: { name: 'QuickNode, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/quicknode',
	privacyPolicy: 'https://www.quicknode.com/privacy',
	repoUrl: 'https://github.com/quiknode-labs',
	twitter: 'https://x.com/quicknode',
	url: 'https://www.quicknode.com/',
}
