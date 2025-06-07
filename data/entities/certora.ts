import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const certora: CorporateEntity & SecurityAuditor = {
	id: 'certora',
	name: 'Certora',
	legalName: { name: 'Certora Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/certora',
	farcaster: 'https://warpcast.com/certora',
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'Israel',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.certora.com/privacy',
	repoUrl: 'https://github.com/Certora',
	twitter: 'https://x.com/CertoraInc',
	url: 'https://www.certora.com/',
}
