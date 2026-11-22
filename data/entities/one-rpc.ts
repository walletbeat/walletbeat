import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * 1RPC operates the RPC endpoints that Zeus bundles for chains 8453 and 42161.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 *
 * The service advertises zero-tracking but publishes no privacy policy page that could be located.
 */
export const oneRpc: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'oneRpc',
	name: '1RPC',
	legalName: { name: 'Automata Network', soundsDifferent: true },
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
	twitter: 'https://x.com/1rpc_',
	url: 'https://www.1rpc.io',
}
