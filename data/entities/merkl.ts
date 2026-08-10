import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const merkl: CorporateEntity & OffchainDataProvider = {
	id: 'merkl',
	name: 'Merkl',
	legalName: { name: 'Angle Labs, Inc.', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: true,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/merkl',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'British Virgin Islands',
	linkedin: 'https://www.linkedin.com/company/merkl-xyz',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/AngleProtocol',
	twitter: 'https://x.com/merkl_xyz',
	url: 'https://merkl.xyz/',
}
