import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { exampleContributor } from '../contributors/example'

export const unratedTemplate: Wallet = {
	metadata: {
		id: 'unrated',
		displayName: 'Unrated wallet template',
		tableName: 'Unrated',
		iconExtension: 'svg',
		blurb: paragraph(`
			This is a fictitious wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
		url: 'https://example.com',
		repoUrl: 'https://example.com/repo',
		contributors: [exampleContributor],
		lastUpdated: '2020-01-01',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: null,
		accountSupport: null,
		multiAddress: null,
		addressResolution: {
			nonChainSpecificEnsResolution: null,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			ref: null,
		},
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
		},
		security: {
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://example.com/privacy-policy',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					arbitrum: null,
					opStack: null,
				},
			},
		},
		license: null,
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: null,
				donations: null,
				ecosystemGrants: null,
				publicOffering: null,
				ventureCapital: null,
				transparentConvenienceFees: null,
				hiddenConvenienceFees: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
			},
			ref: null,
		},
	},
	variants: {
		mobile: false,
		browser: true,
		desktop: false,
		embedded: false,
	},
}
