import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const imToken: CorporateEntity & WalletDeveloper = {
	id: 'imtoken',
	name: 'imToken',
	legalName: { name: 'imToken Pte Ltd', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: 'https://www.crunchbase.com/organization/imtoken',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'Singapore',
	linkedin: 'https://www.linkedin.com/company/imtoken',
	privacyPolicy: 'https://token.im/tos-en.html',
	repoUrl: 'https://github.com/consenlabs/token-core-monorepo',
	twitter: 'https://x.com/imTokenOfficial',
	url: 'https://token.im/',
}
