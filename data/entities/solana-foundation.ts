import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const solanaFoundation: CorporateEntity & ChainDataProvider = {
	id: 'solanaFoundation',
	name: 'Solana Foundation',
	legalName: { name: 'Solana Foundation', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/solana-foundation',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Switzerland',
	linkedin: 'https://www.linkedin.com/company/solana-foundation',
	privacyPolicy: 'https://solana.com/privacy-policy',
	repoUrl: 'https://github.com/solana-foundation',
	twitter: 'https://x.com/SolanaFndn',
	url: 'https://solana.org/',
}
