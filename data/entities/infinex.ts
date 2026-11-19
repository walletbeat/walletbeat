import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const infinexEntity: CorporateEntity & WalletDeveloper = {
	id: 'infinex',
	name: 'Infinex',
	legalName: { name: 'Sempiternal Autarky Foundation', soundsDifferent: true },
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
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://infinex.xyz/legals/privacy-policy',
	repoUrl: 'https://github.com/infinex-xyz',
	twitter: 'https://x.com/infinex',
	url: 'https://infinex.xyz',
}
