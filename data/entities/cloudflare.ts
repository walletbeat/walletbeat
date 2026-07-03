import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const cloudflare: CorporateEntity & InfrastructureProvider = {
	id: 'cloudflare',
	name: 'Cloudflare',
	legalName: { name: 'Cloudflare, Inc.', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/cloudflare',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'San Francisco, California, United States',
	linkedin: 'https://www.linkedin.com/company/cloudflare/',
	privacyPolicy: 'https://www.cloudflare.com/privacypolicy/',
	repoUrl: 'https://github.com/cloudflare',
	twitter: 'https://x.com/Cloudflare',
	url: 'https://www.cloudflare.com/',
}
