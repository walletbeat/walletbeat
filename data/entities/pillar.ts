import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const pillar: CorporateEntity & WalletDeveloper = {
	id: 'pillar',
	name: 'Pillar',
	legalName: { name: 'Pillar Project Worldwide Ltd', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'London',
	linkedin: 'https://www.linkedin.com/company/pillarproject',
	privacyPolicy: 'https://pillarx.app/privacy-policy',
	repoUrl: 'https://github.com/pillarwallet/x',
	twitter: 'https://x.com/PX_Web3',
	url: 'http://pillarx.app',
}
