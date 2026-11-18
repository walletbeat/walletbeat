import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity'

export const candide: CorporateEntity & TransactionBroadcastProvider = {
	id: 'candide',
	name: 'Candide',
	legalName: { name: 'Candide Labs', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/candidelabs/',
	privacyPolicy: 'https://candide.dev/legal/privacy-policy',
	repoUrl: 'https://github.com/candidelabs',
	twitter: 'https://x.com/candidelabs',
	url: 'https://candide.dev/',
}
