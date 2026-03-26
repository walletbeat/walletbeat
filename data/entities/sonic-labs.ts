import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const sonicLabs: CorporateEntity & ChainDataProvider = {
	id: 'sonicLabs',
	name: 'Sonic Labs',
	legalName: { name: 'Sonic Labs Ltd', soundsDifferent: true },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/sonic-labs-2d3f',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Cayman Islands',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy:
		'https://soniclabs.notion.site/Sonic-Privacy-Policy-9582d39482584ec2a2c04078dad04518',
	repoUrl: 'https://github.com/0xsoniclabs',
	twitter: 'https://x.com/SonicLabs',
	url: 'https://www.soniclabs.com/',
}
