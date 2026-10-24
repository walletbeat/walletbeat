import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const trustWallet: CorporateEntity & WalletDeveloper = {
	id: 'trustWallet',
	name: 'Trust Wallet',
	legalName: { name: 'DApps Platform Software Services Ltd.', soundsDifferent: true },
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
	crunchbase: 'https://www.crunchbase.com/organization/trust-wallet',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/trustwallet',
	privacyPolicy: 'https://trustwallet.com/privacy-notice',
	repoUrl: 'https://github.com/trustwallet',
	twitter: 'https://x.com/TrustWallet',
	url: 'https://trustwallet.com/',
}
