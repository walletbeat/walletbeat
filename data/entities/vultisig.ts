import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const vultisigEntity: WalletDeveloper & CorporateEntity = {
	id: 'vultisig',
	name: 'Vultisig',
	legalName: { name: 'Vulti Holdings Limited', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
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
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'British Virgin Islands',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://vultisig.com/privacy',
	repoUrl: 'https://github.com/vultisig',
	twitter: 'https://x.com/vultisig',
	url: 'https://vultisig.com',
}
