import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

export const gridplusWallet: Wallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		iconExtension: 'svg',
		blurb: paragraph(`
			GridPlus Wallet is a secure hardware wallet that combines secure key storage
			with convenient authentication methods.
		`),
		url: 'https://gridplus.io/',
		repoUrl: 'https://github.com/GridPlus',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'gridplus-lattice1',
				name: 'GridPlus Lattice1',
				url: 'https://gridplus.io/products/lattice1',
				isFlagship: true,
			},
		],
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
					details:
						'GridPlus Lattice1 provides clear signing support in some contexts but not all of them with detailed transaction information clearly displayed on device screen for all operations.',
				},
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?si=S4wNFukrmg4rwyFA&t=1141',
						explanation:
							"Independent video demonstration of Keystone's clear signing implementation on Safe.",
					},
				],
			},
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
				details:
					'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
				upgradePathAvailable: true,
				ref: [
					{
						url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
						explanation:
							'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
					},
				],
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
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
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
