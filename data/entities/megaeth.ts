import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const megaeth: CorporateEntity & ChainDataProvider = {
	id: 'megaeth',
	name: 'MegaETH Labs',
	legalName: { name: 'MegaETH Labs', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/megaeth',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Stanford, California, United States',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/megaeth-labs',
	twitter: 'https://x.com/megaeth_labs',
	url: 'https://www.megaeth.com/',
}
