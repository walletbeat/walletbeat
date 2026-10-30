import type {
	ChainDataProvider,
	CorporateEntity,
	OffchainDataProvider,
	SecurityAuditor,
	WalletDeveloper,
} from '@/schema/entity'

export const protofire: CorporateEntity &
	ChainDataProvider &
	OffchainDataProvider &
	SecurityAuditor &
	WalletDeveloper = {
	id: 'protofire',
	name: 'Protofire',
	legalName: { name: 'Altoros LLC (dba Protofire DAO)', soundsDifferent: true },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: true,
		securityAuditor: true,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: 'https://www.crunchbase.com/organization/protofire-io',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: 'Puerto Rico',
	linkedin: 'https://www.linkedin.com/company/protofire-io',
	privacyPolicy: 'https://protofire.io/privacy-policy',
	repoUrl: 'https://github.com/protofire',
	twitter: 'https://x.com/protofire',
	url: 'https://protofire.io',
}
