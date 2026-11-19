import type { WalletDeveloper } from '@/schema/entity'

export const dirkJaeckel: WalletDeveloper = {
	id: 'dirkJaeckel',
	name: 'Dirk Jäckel',
	legalName: { name: 'Dirk Jäckel', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: false,
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
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/biafra23',
	twitter: { type: 'NO_TWITTER_URL' },
	url: { type: 'NO_WEBSITE' },
}
