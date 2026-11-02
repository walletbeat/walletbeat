import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const privyEntity: CorporateEntity & WalletDeveloper = {
	id: 'privy',
	name: 'Privy',
	legalName: { name: 'Horkos, Inc.', soundsDifferent: true },
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
	farcaster: 'https://farcaster.xyz/privy',
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/privyio',
	privacyPolicy: 'https://www.privy.io/privacy-policy',
	repoUrl: 'https://github.com/privy-io',
	twitter: 'https://x.com/privy_io',
	url: 'https://www.privy.io',
}
