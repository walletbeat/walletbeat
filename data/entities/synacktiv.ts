import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const synacktiv: CorporateEntity & SecurityAuditor = {
	id: 'synacktiv',
	name: 'Synacktiv',
	legalName: { name: 'Synacktiv', soundsDifferent: false },
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
	jurisdiction: 'Paris, France',
	linkedin: 'https://www.linkedin.com/company/synacktiv',
	privacyPolicy: 'https://www.synacktiv.com/en/legal-notice',
	repoUrl: 'https://github.com/Synacktiv',
	twitter: 'https://x.com/synacktiv',
	url: 'https://www.synacktiv.com/',
}
