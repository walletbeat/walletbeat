import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * BlockRazor operates the RPC endpoints that Zeus bundles for chain 1.
 * Every endpoint starts disabled and is only used once the user enables it
 * in Network Settings.
 */
export const blockrazor: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'blockrazor',
	name: 'BlockRazor',
	legalName: { name: 'BlockRazor', soundsDifferent: false },
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
	privacyPolicy: 'https://docs.blockrazor.io/statement/privacy-statement',
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/BlockRazor_Inc',
	url: 'https://blockrazor.io',
}
