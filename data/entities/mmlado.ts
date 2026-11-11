import type { WalletDeveloper } from '@/schema/entity'

/**
 * mmlado is an individual community developer, not a company, and not part of
 * Logos or Status, the makers of Keycard. Logos provides development hardware
 * (a Mac and an iPhone) and Keycard devices, readers and stickers as marketing
 * material free of charge. There is no employment or equity relationship.
 */
export const mmladoDeveloper: WalletDeveloper = {
	id: 'mmlado',
	name: 'mmlado',
	legalName: 'NOT_A_LEGAL_ENTITY',
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
	jurisdiction: 'Serbia',
	linkedin: 'https://www.linkedin.com/in/mladenmilankovic/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/mmlado',
	twitter: 'https://x.com/mmlado_eth',
	url: 'https://mmlado.github.io/',
}
