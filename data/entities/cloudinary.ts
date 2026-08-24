import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const cloudinary: CorporateEntity & InfrastructureProvider = {
	id: 'cloudinary',
	name: 'Cloudinary',
	legalName: { name: 'Cloudinary Ltd.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/cloudinary',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Santa Clara, California, United States',
	linkedin: 'https://linkedin.com/company/cloudinary',
	privacyPolicy: 'https://cloudinary.com/privacy',
	repoUrl: 'https://github.com/cloudinary',
	twitter: 'https://x.com/cloudinary',
	url: 'https://cloudinary.com/',
}
