import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const imgix: CorporateEntity & InfrastructureProvider = {
	id: 'imgix',
	name: 'imgix',
	legalName: { name: 'Zebrafish Labs, Inc.', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: true,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/imgix',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'California, United States',
	linkedin: 'https://linkedin.com/company/imgix',
	privacyPolicy: 'https://www.imgix.com/privacy',
	repoUrl: 'https://github.com/imgix',
	twitter: 'https://x.com/imgix',
	url: 'https://www.imgix.com/',
}
