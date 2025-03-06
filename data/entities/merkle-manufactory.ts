import type { CorporateEntity } from '@/schema/entity'

export const merkleManufactory: CorporateEntity = {
	id: 'merkle-manufactory',
	name: 'Merkle Manufactory',
	legalName: { name: 'Merkle Manufactory Inc', soundsDifferent: false },
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
	icon: 'NO_ICON',
	jurisdiction: 'Los Angeles, California, United States',
	url: 'https://merklemanufactory.com/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	crunchbase: 'https://www.crunchbase.com/organization/merkle-manufactory',
}
