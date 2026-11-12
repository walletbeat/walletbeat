import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const kudelskiSecurity: CorporateEntity & SecurityAuditor = {
	id: 'kudelski-security',
	name: 'Kudelski Security',
	legalName: { name: 'Kudelski Security', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/kudelski-security',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: 'Cheseaux-sur-Lausanne, Switzerland',
	linkedin: 'https://www.linkedin.com/company/kudelski-security',
	privacyPolicy: 'https://kudelskisecurity.com/privacy-notice',
	repoUrl: 'https://github.com/kudelskisecurity',
	twitter: 'https://x.com/KudelskiSec',
	url: 'https://kudelskisecurity.com/',
}
