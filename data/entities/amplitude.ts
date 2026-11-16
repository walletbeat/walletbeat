import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const amplitude: CorporateEntity & OffchainDataProvider = {
	id: 'amplitude',
	name: 'Amplitude',
	legalName: { name: 'Amplitude, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/amplitude',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/amplitude-analytics',
	privacyPolicy: 'https://amplitude.com/privacy',
	repoUrl: 'https://github.com/amplitude',
	twitter: 'https://x.com/Amplitude_HQ',
	url: 'https://amplitude.com/',
}
