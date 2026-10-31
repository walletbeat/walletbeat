import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * MEV Blocker, the RPC endpoint that auctions backrun rights to searchers.
 * Zeus ships `https://rpc.mevblocker.io` as a built-in endpoint and can route
 * transactions through it when MEV Protect is on.
 */
export const mevBlocker: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'mevBlocker',
	name: 'MEV Blocker',
	legalName: { name: 'ConsenSys Software Inc', soundsDifferent: true },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://consensys.io/privacy-notice',
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://mevblocker.io',
}
