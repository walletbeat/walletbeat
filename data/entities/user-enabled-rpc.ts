import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * Stand-in entity for external RPC endpoints the user chooses to enable.
 * Zeus ships a rotating list of default public RPCs.
 * none are used until the user enables one. Operators of those endpoints
 * (whoever they are at the time) learn connection metadata and chain queries.
 */
export const userEnabledRpcEndpoints: CorporateEntity &
	ChainDataProvider &
	TransactionBroadcastProvider = {
	id: 'userEnabledRpcEndpoints',
	name: 'User-enabled external RPC endpoints',
	legalName: 'NOT_A_LEGAL_ENTITY',
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
	url: { type: 'NO_WEBSITE' },
}
