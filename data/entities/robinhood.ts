import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * Robinhood operates the RPC endpoints that Zeus bundles for chain 4663.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 */
export const robinhood: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'robinhood',
	name: 'Robinhood',
	legalName: { name: 'Robinhood Markets, Inc.', soundsDifferent: false },
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
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://robinhood.com/us/en/support/articles/privacy-policy',
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://robinhood.com',
}
