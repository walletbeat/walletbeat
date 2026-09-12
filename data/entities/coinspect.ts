import type { CorporateEntity } from '@/schema/entity'

export const coinspect: CorporateEntity = {
	id: 'coinspect',
	name: 'Coinspect',
	legalName: { name: 'Coinspect Security LLC', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/coinspect',
	privacyPolicy: 'https://www.coinspect.com/legal/privacy/',
	repoUrl: 'https://github.com/coinspect',
	twitter: 'https://x.com/coinspect',
	url: 'https://www.coinspect.com/',
}
