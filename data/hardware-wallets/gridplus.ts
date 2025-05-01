import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported } from '@/schema/features/support'
import type { Wallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { nconsigny } from '../contributors/nconsigny'

export const gridplusWallet: Wallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		blurb: paragraph(`
			GridPlus Wallet is a secure hardware wallet that combines secure key storage
			with convenient authentication methods.
		`),
		contributors: [nconsigny],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'gridplus-lattice1',
				name: 'GridPlus Lattice1',
				isFlagship: true,
				url: 'https://gridplus.io/products/lattice1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/GridPlus',
		url: 'https://gridplus.io/',
	},
	features: {
		accountSupport: null,
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
			ref: null,
		},
		chainConfigurability: null,
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
		},
		license: null,
		monetization: {
			ref: null,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: null,
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://gridplus.io/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				details:
					'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
				ref: [
					{
						explanation:
							'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
						url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
					},
				],
				upgradePathAvailable: true,
				url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
			},
			hardwareWalletDappSigning: {
				details:
					'GridPlus Lattice1 provides clear signing support in some contexts but not all of them with detailed transaction information clearly displayed on device screen for all operations.',
				level: DappSigningLevel.PARTIAL,
				ref: [
					{
						explanation:
							"Independent video demonstration of Keystone's clear signing implementation on Safe.",
						url: 'https://youtu.be/7lP_0h-PPvY?t=1141',
					},
				],
			},
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {
					[HardwareWalletType.GRIDPLUS]: featureSupported,
				},
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
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
		transparency: {
			feeTransparency: null,
		},
	},
	variants: {
		browser: false,
		desktop: false,
		embedded: false,
		hardware: true,
		mobile: false,
	},
}
