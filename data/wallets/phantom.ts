import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { polymutex } from '../contributors/polymutex'

export const phantom: Wallet = {
	metadata: {
		id: 'phantom',
		displayName: 'Phantom',
		tableName: 'Phantom',
		iconExtension: 'svg',
		blurb: paragraph(`
			Phantom is a user-friendly Ethereum and Solana wallet. It focuses
			on ease of use, easy swapping of tokens and NFTs, and integration
			with popular DeFi and NFT exchange protocols within the wallet.
		`),
		url: 'https://www.phantom.com',
		repoUrl: null,
		contributors: [polymutex],
		lastUpdated: '2025-02-08',
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
			privacyPolicy: 'https://www.phantom.com/privacy',
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
		mobile: true,
		browser: true,
		desktop: false,
		embedded: false,
	},
}
