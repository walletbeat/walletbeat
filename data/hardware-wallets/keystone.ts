import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported } from '@/schema/features/support'
import type { Wallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { nconsigny } from '../contributors/nconsigny'

export const keystoneWallet: Wallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone Wallet',
		tableName: 'Keystone',
		blurb: paragraph(`
			Keystone Wallet is a self-custodial hardware wallet that provides secure private
			key storage. It uses QR codes for air-gapped transaction signing.
		`),
		contributors: [nconsigny],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keystone-pro',
				name: 'Keystone Pro',
				isFlagship: true,
				url: 'https://keyst.one/pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/KeystoneHQ',
		url: 'https://keyst.one/',
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
			privacyPolicy: 'https://keyst.one/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				details:
					'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users.',
				ref: [
					{
						explanation:
							'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users',
						url: 'https://keyst.one/bug-bounty-program',
					},
				],
				upgradePathAvailable: false,
				url: 'https://keyst.one/bug-bounty-program',
			},
			hardwareWalletDappSigning: {
				details:
					'Keystone provides full clear signing support with detailed transaction information displayed on device screen. This was verified through independent reviews showing its robust hardware wallet security features.',
				level: DappSigningLevel.FULL,
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
					[HardwareWalletType.KEYSTONE]: featureSupported,
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
