import type {
	ChainDataProvider,
	CorporateEntity,
	TransactionBroadcastProvider,
} from '@/schema/entity'

/**
 * Flashbots Protect, the private transaction submission RPC operated by
 * Flashbots. Zeus ships `https://rpc.flashbots.net/fast` as a built-in
 * endpoint and can route transactions through it when MEV Protect is on.
 */
export const flashbots: CorporateEntity & ChainDataProvider & TransactionBroadcastProvider = {
	id: 'flashbots',
	name: 'Flashbots Protect',
	legalName: { name: 'Flashbots Ltd.', soundsDifferent: true },
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
	jurisdiction: 'Cayman Islands',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://docs.flashbots.net/policies/privacy',
	repoUrl: 'https://github.com/flashbots',
	twitter: 'https://x.com/flashbots',
	url: 'https://www.flashbots.net',
}
