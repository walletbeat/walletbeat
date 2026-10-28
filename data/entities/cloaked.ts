import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const cloakedTechnologies: CorporateEntity & WalletDeveloper = {
	id: 'cloakedTechnologies',
	name: 'Cloaked',
	legalName: { name: 'Cloaked Technologies, Inc.', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: 'https://farcaster.xyz/cloaked',
	icon: { extension: 'png', height: 256, width: 256 },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://clkd.xyz/docs/privacy',
	repoUrl: 'https://github.com/cloakedxyz',
	twitter: 'https://x.com/staycloakedxyz',
	url: 'https://clkd.xyz',
}
