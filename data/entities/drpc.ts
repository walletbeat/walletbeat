import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * dRPC operates the RPC endpoints that Zeus bundles for chains 10 and 4663.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 *
 * No public privacy policy page for the service could be located.
 */
export const drpc: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'drpc',
	name: 'dRPC',
	legalName: { name: 'dRPC', soundsDifferent: false },
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
	linkedin: 'https://www.linkedin.com/company/drpc-org',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/dRPCorg',
	url: 'https://drpc.org',
}
