import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const github: CorporateEntity & OffchainDataProvider = {
	id: 'github',
	name: 'Github',
	legalName: { name: 'GitHub Inc', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'UNKNOWN',
	url: 'https://github.com/',
	repoUrl: 'https://github.com',
	privacyPolicy:
		'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
	crunchbase: 'https://www.crunchbase.com/organization/github',
	linkedin: 'https://www.linkedin.com/company/github/',
	twitter: 'https://x.com/github',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
}
