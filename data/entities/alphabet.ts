import type { CorporateEntity } from '@/schema/entity'

export const alphabet: CorporateEntity = {
	id: 'alphabet',
	name: 'Alphabet',
	legalName: { name: 'Alphabet Inc', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/alphabet',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'svg',
	},
	jurisdiction: 'United States',
	linkedin: 'https://www.linkedin.com/company/alphabet-inc',
	privacyPolicy: 'https://policies.google.com/privacy',
	repoUrl: 'https://github.com/google',
	twitter: 'https://x.com/alphabetlnc',
	url: 'https://abc.xyz/',
}
