import type { ChainDataProvider, CorporateEntity } from '@/schema/entity'

export const etherscan: CorporateEntity & ChainDataProvider = {
	id: 'etherscan',
	name: 'EtherScan',
	legalName: { name: 'Etherscan', soundsDifferent: false },
	type: {
		chainDataProvider: true,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/etherscan',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/etherscan/',
	privacyPolicy: 'https://etherscan.io/privacypolicy',
	repoUrl: { type: 'NO_REPO' },
	twitter: 'https://x.com/etherscan',
	url: 'https://etherscan.io/',
}
