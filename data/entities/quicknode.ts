import type { ChainDataProvider, CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const quicknode: CorporateEntity & ChainDataProvider & InfrastructureProvider = {
	id: 'quicknode',
	name: 'QuickNode',
	legalName: { name: 'QuikNode, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: true,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/quiknode',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Hallandale Beach, Florida, United States',
	linkedin: 'https://www.linkedin.com/company/quicknode/',
	privacyPolicy: 'https://www.quicknode.com/privacy',
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/QuickNode',
	url: 'https://www.quicknode.com/',
}
