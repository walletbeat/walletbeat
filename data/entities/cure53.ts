import type { CorporateEntity, SecurityAuditor } from '@/schema/entity';

export const cure53: CorporateEntity & SecurityAuditor = {
	id: 'cure53',
	name: 'Cure53',
	legalName: { name: 'Cure53', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/cure53',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: {
		extension: 'png',
		height: 136,
		width: 137,
	},
	jurisdiction: 'Berlin, Germany',
	linkedin: 'https://www.linkedin.com/company/cure53',
	privacyPolicy: 'https://cure53.de/datenschutz.php',
	repoUrl: 'https://github.com/cure53',
	twitter: 'https://x.com/cure53berlin',
	url: 'https://cure53.de/',
};
