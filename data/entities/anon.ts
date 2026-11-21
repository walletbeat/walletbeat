import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const anonEntity: CorporateEntity & WalletDeveloper = {
	id: 'anon',
	name: 'Anon',
	legalName: { name: 'AHLOOP LLC', soundsDifferent: true },
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
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://anon.inc/privacy',
	repoUrl: 'https://github.com/anondotinc',
	twitter: 'https://x.com/anondotinc',
	url: 'https://anon.inc',
}
