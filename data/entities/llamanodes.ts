import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * LlamaNodes operates the RPC endpoints that Zeus bundles for chain 56.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 *
 * No public privacy policy page for the service could be located.
 */
export const llamanodes: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'llamanodes',
	name: 'LlamaNodes',
	legalName: { name: 'LlamaNodes', soundsDifferent: false },
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
	repoUrl: 'https://github.com/llamanodes',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://llamanodes.com',
}
