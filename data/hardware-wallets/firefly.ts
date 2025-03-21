import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { firefly } from '../entities/firefly'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

export const fireflyWallet: Wallet = {
	metadata: {
		id: 'firefly',
		displayName: 'Firefly',
		tableName: 'Firefly',
		iconExtension: 'svg',
		blurb: paragraph(`
			Firefly is a DIY open-source hardware wallet for secure cryptocurrency management.
			It's designed for users who want to build their own hardware wallet with full transparency and control.
		`),
		url: 'https://firefly.city/',
		repoUrl: 'https://github.com/firefly',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
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
					[HardwareWalletType.FIREFLY]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.NONE,
					details:
						'Firefly currently does not provide clear signing support as it is still in development.',
				},
				ref: null,
			},
			bugBountyProgram: {
				type: BugBountyProgramType.NONE,
				url: '',
				details: 'No formal bug bounty program has been established for the Firefly DIY wallet.',
				upgradePathAvailable: false,
				ref: undefined,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: '',
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
