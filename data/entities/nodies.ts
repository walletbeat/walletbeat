import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * Nodies operates the RPC endpoints that Zeus bundles for chain 56.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 *
 * No public privacy policy page for the service could be located.
 */
export const nodies: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'nodies',
	name: 'Nodies',
	legalName: { name: 'Nodies', soundsDifferent: false },
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
	linkedin: 'https://www.linkedin.com/company/nodies',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: { type: 'NO_REPO' },
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://www.nodies.app',
}
