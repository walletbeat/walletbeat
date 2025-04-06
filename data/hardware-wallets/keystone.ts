import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

export const keystoneWallet: Wallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone Wallet',
		tableName: 'Keystone',
		iconExtension: 'svg',
		blurb: paragraph(`
			Keystone Wallet is a self-custodial hardware wallet that provides secure private
			key storage. It uses QR codes for air-gapped transaction signing.
		`),
		url: 'https://keyst.one/',
		repoUrl: 'https://github.com/KeystoneHQ',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keystone-pro',
				name: 'Keystone Pro',
				url: 'https://keyst.one/pro',
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
					[HardwareWalletType.KEYSTONE]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				level: ClearSigningLevel.FULL,
				details:
					'Keystone provides full clear signing support with detailed transaction information displayed on device screen. This was verified through independent reviews showing its robust hardware wallet security features.',
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?t=1141',
						explanation:
							"Independent video demonstration of Keystone's clear signing implementation on Safe.",
					},
				],
			},
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://keyst.one/bug-bounty-program',
				details:
					'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users.',
				upgradePathAvailable: false,
				ref: [
					{
						url: 'https://keyst.one/bug-bounty-program',
						explanation:
							'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users',
					},
				],
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://keyst.one/privacy-policy',
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
