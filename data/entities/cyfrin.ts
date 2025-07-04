import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const cyfrin: CorporateEntity & SecurityAuditor = {
	id: 'cyfrin',
	name: 'Cyfrin',
	legalName: { name: 'Cyfrin', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/cyfrin',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States / United Kingdom',
	linkedin: 'https://www.linkedin.com/company/cyfrin/',
	privacyPolicy: 'https://www.cyfrin.io/privacy-policy',
	repoUrl: 'https://github.com/Cyfrin',
	twitter: 'https://x.com/CyfrinAudits',
	url: 'https://www.cyfrin.io',
}
