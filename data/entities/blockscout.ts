import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const blockscout: CorporateEntity & ChainDataProvider = {
	id: 'blockscout',
	name: 'Blockscout',
	legalName: { name: 'Blockscout Limited', soundsDifferent: false },
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
	farcaster: 'https://warpcast.com/blockscout',
	icon: 'NO_ICON',
	jurisdiction: 'Seychelles',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://eaas.blockscout.com/privacy-notice',
	repoUrl: 'https://github.com/blockscout',
	twitter: 'https://x.com/blockscout',
	url: 'https://www.blockscout.com/',
}
