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
	icon: {
		extension: 'png',
		width: 137,
		height: 136,
	},
	jurisdiction: 'Berlin, Germany',
	url: 'https://cure53.de/',
	repoUrl: 'https://github.com/cure53',
	privacyPolicy: 'https://cure53.de/datenschutz.php',
	crunchbase: 'https://www.crunchbase.com/organization/cure53',
	linkedin: 'https://www.linkedin.com/company/cure53',
	twitter: 'https://x.com/cure53berlin',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
};
