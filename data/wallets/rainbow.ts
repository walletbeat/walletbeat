import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { polymutex } from '../contributors/polymutex'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { WalletTypeCategory } from '@/schema/features/wallet-type'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { featureSupported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import { License } from '@/schema/features/license'

export const rainbow: Wallet = {
	metadata: {
		id: 'rainbow',
		displayName: 'Rainbow',
		tableName: 'Rainbow',
		iconExtension: 'svg',
		blurb: paragraph(`
			Rainbow Extension. Built for speed. Built for power. Built for You.
		`),
		url: 'https://rainbow.me',
		repoUrl: 'https://github.com/rainbow-me/rainbow',
		contributors: [polymutex],
		lastUpdated: '2025-02-08',
		multiWalletType: {
			categories: [WalletTypeCategory.EOA],
		},
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
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.LEDGER]: featureSupported,
					[HardwareWalletType.TREZOR]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.NONE,
					details: 'No hardware wallet clear signing information available.',
				},
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://rainbow.me/privacy',
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
		license: {
			license: License.GPL_3_0,
			ref: [
				{
					url: 'https://github.com/rainbow-me/rainbow/blob/develop/LICENSE',
					label: 'Rainbow License File',
					explanation: 'Rainbow uses the GPL-3.0 license for its source code',
				},
			],
		},
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
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
