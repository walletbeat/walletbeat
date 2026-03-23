import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const sentry: CorporateEntity & OffchainDataProvider = {
	id: 'sentry',
	name: 'Sentry',
	legalName: { name: 'Functional Software, Inc.', soundsDifferent: true },
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
	crunchbase: 'https://www.crunchbase.com/organization/sentry',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/getsentry',
	privacyPolicy: 'https://sentry.io/privacy/',
	repoUrl: 'https://github.com/getsentry',
	twitter: 'https://x.com/sentry',
	url: 'https://sentry.io/',
}
