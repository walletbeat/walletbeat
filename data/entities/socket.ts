import type { CorporateEntity, OffchainDataProvider } from '@/schema/entity'

export const socket: CorporateEntity & OffchainDataProvider = {
	id: 'socket',
	name: 'Socket',
	legalName: { name: 'Socket Technology', soundsDifferent: false },
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
	crunchbase: { type: 'NO_CRUNCHBASE_URL' },
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: { type: 'UNKNOWN' },
	linkedin: 'https://www.linkedin.com/company/socketdottech/',
	privacyPolicy: { type: 'NO_PRIVACY_POLICY' },
	repoUrl: 'https://github.com/SocketDotTech',
	twitter: 'https://x.com/SocketProtocol',
	url: 'https://www.socket.tech/',
}
