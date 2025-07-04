import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const claveEntity: CorporateEntity & WalletDeveloper = {
	id: 'clave',
	name: 'Clave',
	legalName: { name: 'Clave Technologies Ltd.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'HAS_CRUNCHBASE_URL', url: 'https://www.crunchbase.com/organization/clave-de99' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'United Kingdom',
	linkedin: { type: 'HAS_LINKEDIN_URL', url: 'https://www.linkedin.com/company/getclave/' },
	privacyPolicy: 'https://www.getclave.com/privacy-policy',
	repoUrl: 'https://github.com/getclave/clave-contracts',
	twitter: { type: 'HAS_TWITTER_URL', url: 'https://x.com/getclave' },
	url: 'https://www.getclave.com',
}