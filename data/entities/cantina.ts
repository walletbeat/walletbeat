import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const cantina: CorporateEntity & SecurityAuditor = {
	id: 'cantina',
	name: 'Cantina',
	legalName: { name: 'Cantina Consulting', soundsDifferent: false },
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
	icon: 'NO_ICON',
	jurisdiction: 'United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://cantina.xyz/privacy-policy',
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/cantinaxyz',
	url: 'https://cantina.xyz/',
}
