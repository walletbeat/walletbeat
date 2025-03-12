import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { gridplus } from '../entities/gridplus'

export const gridplusWallet: Wallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Lattice1',
		tableName: 'GridPlus',
		iconExtension: 'svg',
		blurb: paragraph(`
			GridPlus Lattice1 is a secure hardware wallet designed for advanced users.
			It features a touchscreen interface and supports multiple cryptocurrencies.
		`),
		url: 'https://gridplus.io/',
		repoUrl: 'https://github.com/GridPlus/lattice-firmware',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
	},
	features: {
		profile: WalletProfile.HARDWARE,
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
			passkeyVerification: null,
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.GRIDPLUS]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.PARTIAL,
					details: 'GridPlus Lattice1 provides partial clear signing support with most transaction details displayed on the device screen, but some complex transactions may not show all details.'
				},
				ref: null,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://gridplus.io/privacy',
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
		transparency: {
			feeTransparency: null,
		},
	},
	variants: {
		mobile: false,
		browser: false,
		desktop: false,
		embedded: false,
		hardware: true,
	},
}
