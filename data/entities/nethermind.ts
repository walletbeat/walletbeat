import type { CorporateEntity, SecurityAuditor } from '@/schema/entity'

export const nethermind: CorporateEntity & SecurityAuditor = {
	id: 'nethermind',
	name: 'Nethermind',
	legalName: { name: 'Nethermind', soundsDifferent: false },
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
	crunchbase: 'https://www.crunchbase.com/organization/nethermind',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'United Kingdom',
	linkedin: 'https://www.linkedin.com/company/nethermind/',
	privacyPolicy: 'https://nethermind.io/privacy-policy',
	repoUrl: 'https://github.com/NethermindEth',
	twitter: 'https://x.com/nethermindeth',
	url: 'https://nethermind.io',
}
