import type { CorporateEntity, DataBroker } from '@/schema/entity';

export const honeycomb: CorporateEntity & DataBroker = {
	id: 'honeycomb',
	name: 'Honeycomb',
	legalName: { name: 'Hound Technology, Inc', soundsDifferent: true },
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
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'San Francisco, California, United States',
	url: 'https://www.honeycomb.io/',
	repoUrl: 'https://github.com/honeycombio',
	privacyPolicy: 'https://www.honeycomb.io/privacy',
	crunchbase: 'https://www.crunchbase.com/organization/honeycombio',
	linkedin: 'https://www.linkedin.com/company/honeycomb.io',
	twitter: 'https://x.com/honeycombio',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
};
