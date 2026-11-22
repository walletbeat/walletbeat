import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * Tenderly operates the RPC endpoints that Zeus bundles for chains 1, 10 and 8453.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 */
export const tenderly: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'tenderly',
	name: 'Tenderly',
	legalName: { name: 'Tenderly D.O.O.', soundsDifferent: false },
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
	privacyPolicy: 'https://tenderly.co/privacy',
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://tenderly.co',
}
