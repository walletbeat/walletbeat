import type { WalletDeveloper } from '@/schema/entity'

/**
 * src_co is not a company. It has no legal personality, no share capital and
 * no registered jurisdiction — the "organization" is itself a deployed
 * Multisig instance, and its GitHub organization is the only off-chain
 * surface it has. `jurisdiction` is therefore `UNKNOWN` rather than `GLOBAL`:
 * the signers are real people somewhere, we simply do not publish where.
 */
export const srcCo: WalletDeveloper = {
	id: 'srcCo',
	name: 'src_co',
	legalName: 'NOT_A_LEGAL_ENTITY',
	type: {
		chainDataProvider: false,
		corporate: false,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/src-company',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://source.wei.domains',
}
