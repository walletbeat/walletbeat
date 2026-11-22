import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * PublicNode operates the RPC endpoints that Zeus bundles for chains 1, 10, 56, 8453, 42161 and 4663.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 *
 * No public privacy policy page for the service could be located.
 */
export const publicnode: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'publicnode',
	name: 'PublicNode',
	legalName: { name: 'Allnodes Inc.', soundsDifferent: true },
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
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.publicnode.com',
}
