import type { CorporateEntity, WalletDeveloper } from '@/schema/entity'

/**
 * Keycard entity.
 *
 * Legal details (not included in Entity interface):
 * - Legal entity: Status Research & Development Deutschland GmbH
 * - Contact: legal@status.im
 * - Address: ℅ Cormoran GmbH, Am Zirkus 2, 10117 Berlin, Germany
 * - Terms of use: https://keycard.tech/legal/terms-of-use
 */
export const keycard: CorporateEntity & WalletDeveloper = {
	id: 'keycard',
	name: 'Keycard',
	legalName: { name: 'Status Research & Development Deutschland GmbH', soundsDifferent: true },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: false,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: true,
	},
	crunchbase: 'https://www.crunchbase.com/organization/status-31aa',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: { extension: 'svg' },
	jurisdiction: 'Germany',
	linkedin: { type: 'NO_LINKEDIN_URL' },
	privacyPolicy: 'https://keycard.tech/legal/privacy-policy',
	repoUrl: 'https://github.com/keycard-tech',
	twitter: 'https://x.com/Keycard_',
	url: 'https://keycard.tech/',
}
