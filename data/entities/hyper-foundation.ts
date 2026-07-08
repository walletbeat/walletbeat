import type { CorporateEntity, Exchange } from '@/schema/entity'

export const hyperFoundation: CorporateEntity & Exchange = {
	id: 'hyperFoundation',
	name: 'Hyper Foundation',
	legalName: { name: 'Hyper Foundation', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: true,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/hyperliquid',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Cayman Islands',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://hyperfoundation.org/privacyPolicy',
	repoUrl: 'https://github.com/hyperliquid-dex',
	twitter: 'https://x.com/hyperliquidX',
	url: 'https://hyperfoundation.org/',
}
