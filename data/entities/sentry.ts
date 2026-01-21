import type { CorporateEntity, DataBroker } from '@/schema/entity'

export const sentry: CorporateEntity & DataBroker = {
	id: 'sentry',
	name: 'Sentry',
	legalName: { name: 'Functional Software Inc', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: true,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/sentry',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://linkedin.com/company/getsentry',
	privacyPolicy: 'https://sentry.io/privacy/',
	repoUrl: 'https://github.com/getsentry',
	twitter: 'https://x.com/sentry',
	url: 'https://sentry.io/',
}
