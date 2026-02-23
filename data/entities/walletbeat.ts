import type { Entity } from '@/schema/entity'

export const walletbeat: Entity = {
	id: 'walletbeat',
	name: 'Walletbeat',
	legalName: { name: 'Walletbeat', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: false,
		dataBroker: false,
		exchange: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: 'http://farcaster.xyz/walletbeat',
	icon: 'NO_ICON',
	jurisdiction: 'Ethereum',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' }, // No data collection
	repoUrl: 'https://github.com/walletbeat/walletbeat',
	twitter: 'http://x.com/walletbeat',
	url: 'https://walletbeat.eth',
}
