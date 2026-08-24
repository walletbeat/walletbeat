import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const microsoft: CorporateEntity & OffchainDataProvider = {
	id: 'microsoft',
	name: 'Microsoft',
	legalName: { name: 'Microsoft Corporation', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/microsoft',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Redmond, Washington, United States',
	linkedin: 'https://linkedin.com/company/microsoft',
	privacyPolicy: 'https://privacy.microsoft.com/privacystatement',
	repoUrl: 'https://github.com/microsoft',
	twitter: 'https://x.com/microsoft',
	url: 'https://www.microsoft.com/',
}
