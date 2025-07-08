import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

export const bitbox: CorporateEntity & WalletDeveloper = {
	id: 'bitbox',
	name: 'BitBox/Shift Crypto',
	legalName: { name: 'Shift Crypto AG', soundsDifferent: false },
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
	jurisdiction: 'Switzerland',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://bitbox.swiss/policies/privacy-policy/',
	repoUrl: 'https://github.com/BitBoxSwiss/bitbox02-firmware',
	twitter: { type: 'NO_TWITTER_URL' },
	url: 'https://bitbox.swiss/',
}
