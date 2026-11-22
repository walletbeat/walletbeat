import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const across: CorporateEntity & OffchainDataProvider = {
	id: 'across',
	name: 'Across Protocol',
	legalName: { name: 'Across Protocol', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://across.to/privacy-policy',
	repoUrl: 'https://github.com/across-protocol',
	twitter: 'https://x.com/AcrossProtocol',
	url: 'https://across.to/',
}
