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
		iconExtension: 'svg',
		blurb: paragraph(`
			Firefly Wallet is a hardware wallet that uses biometrics
			for user authentication and secure private key management.
		`),
		url: 'https://firefly.technology/',
		repoUrl: null,
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
		hardwareWalletModels: [
			{
				id: 'firefly-v1',
				name: 'Firefly V1',
				url: 'https://firefly.technology/',
				isFlagship: true,
			},
		],
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
			hardwareWalletDappSigning: {
				level: DappSigningLevel.NONE,
				details:
					'Firefly currently does not provide clear signing support as it is still in development.',
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
		transparency: {
			feeTransparency: null,
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
		browser: false,
		desktop: false,
		embedded: false,
		hardware: true,
	},
}
