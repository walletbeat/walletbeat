import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const keylabs: CorporateEntity & SecurityAuditor = {
	id: 'keylabs',
	name: 'KeyLabs',
	legalName: { name: 'KeyLabs', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/keylabsio/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/keylabsio',
	twitter: 'https://x.com/keylabsio',
	url: 'https://keylabs.io/',
}
