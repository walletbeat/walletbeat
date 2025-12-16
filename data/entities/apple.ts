import type { CorporateEntity } from '@/schema/entity'

export const apple: CorporateEntity = {
	id: 'apple',
	name: 'Apple',
	legalName: { name: 'Apple Inc', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/apple',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/apple',
	privacyPolicy: 'https://www.apple.com/legal/privacy/',
	repoUrl: 'https://github.com/Apple',
	twitter: 'https://x.com/Apple',
	url: 'https://apple.com/',
}
