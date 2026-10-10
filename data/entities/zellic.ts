import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const zellic: CorporateEntity & SecurityAuditor = {
	id: 'zellic',
	name: 'Zellic',
	legalName: { name: 'Zellic', soundsDifferent: false },
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
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/zellic',
	privacyPolicy: 'https://www.zellic.io/privacy-policy',
	repoUrl: 'https://github.com/zellic',
	twitter: 'https://x.com/zellic_io',
	url: 'https://www.zellic.io/',
}
