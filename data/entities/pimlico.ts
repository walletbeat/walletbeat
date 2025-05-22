import type { CorporateEntity, TransactionBroadcastProvider } from '@/schema/entity';

export const pimlico: CorporateEntity & TransactionBroadcastProvider = {
	id: 'pimlico',
	name: 'Pimlico',
	legalName: { name: 'Austerlitz Labs Ltd', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: true,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/pimlico',
	farcaster: 'https://warpcast.com/pimlico',
	icon: {
		extension: 'png',
		height: 200,
		width: 200,
	},
	jurisdiction: 'London, England, United Kingdom',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://www.pimlico.io/privacy',
	repoUrl: 'https://github.com/pimlicolabs',
	twitter: 'https://x.com/pimlicoHQ',
	url: 'https://www.pimlico.io/',
};
