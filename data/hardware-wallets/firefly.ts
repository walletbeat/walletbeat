import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported } from '@/schema/features/support'
import type { Wallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { nconsigny } from '../contributors/nconsigny'

export const fireflyWallet: Wallet = {
	metadata: {
		id: 'firefly',
		displayName: 'Firefly Wallet',
		tableName: 'Firefly',
		blurb: paragraph(`
			Firefly Wallet is a hardware wallet that uses biometrics
			for user authentication and secure private key management.
		`),
		contributors: [nconsigny],
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
		hardwareWalletModels: [
			{
				id: 'firefly-v1',
				name: 'Firefly V1',
				isFlagship: true,
				url: 'https://firefly.technology/',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: null,
		url: 'https://firefly.technology/',
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
			privacyPolicy: '',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.NONE,
				details: 'No formal bug bounty program has been established for the Firefly DIY wallet.',
				ref: undefined,
				upgradePathAvailable: false,
				url: '',
			},
			hardwareWalletDappSigning: {
				details:
					'Firefly currently does not provide clear signing support as it is still in development.',
				level: DappSigningLevel.NONE,
				ref: null,
			},
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {
					[HardwareWalletType.FIREFLY]: featureSupported,
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
