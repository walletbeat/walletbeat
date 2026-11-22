import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * ZAN operates the RPC endpoints that Zeus bundles for chain 56.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 */
export const zan: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'zan',
	name: 'ZAN',
	legalName: { name: 'Ant Digital Technologies', soundsDifferent: true },
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
	privacyPolicy: 'https://a.zan.top/static/Privacy-Policy.pdf',
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://zan.top',
}
