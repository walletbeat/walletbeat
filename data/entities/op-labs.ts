import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * OP Labs operates the RPC endpoints that Zeus bundles for chain 10.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 */
export const opLabs: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'opLabs',
	name: 'OP Labs',
	legalName: { name: 'OP Labs PBC', soundsDifferent: false },
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
	privacyPolicy: 'https://www.oplabs.co/privacy-policy',
	repoUrl: 'https://github.com/ethereum-optimism',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.oplabs.co',
}
