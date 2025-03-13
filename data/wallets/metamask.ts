import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { polymutex } from '../contributors/polymutex'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { featureSupported } from '@/schema/features/support'
import { WalletTypeCategory, SmartWalletStandard } from '@/schema/features/wallet-type'

export const metamask: Wallet = {
	metadata: {
		id: 'metamask',
		displayName: 'MetaMask',
		tableName: 'MetaMask',
		iconExtension: 'svg',
		blurb: paragraph(`
			MetaMask is a popular Ethereum wallet created by Consensys and that has
			been around for a long time. It is a jack-of-all-trades wallet that can
			be extended through MetaMask Snaps.
		`),
		url: 'https://metamask.io',
		repoUrl: 'https://github.com/MetaMask/metamask-extension',
		contributors: [polymutex, nconsigny],
		lastUpdated: '2025-02-08',
		multiWalletType: {
			categories: [WalletTypeCategory.EOA, WalletTypeCategory.SMART_WALLET],
			smartWalletStandards: [SmartWalletStandard.ERC_7702],
			details: "Supports EOA with 7702 delegation"
		}
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
			passkeyVerification: {
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl: 'https://github.com/MetaMask/delegation-framework/blob/635f717372f58a2b338964ba8e3de4ad285c9a47/src/libraries/P256FCLVerifierLib.sol',
				details: 'MetaMask uses FreshCryptoLib for passkey verification in their delegation framework.',
				ref: [
					{
						url: 'https://github.com/MetaMask/delegation-framework/blob/635f717372f58a2b338964ba8e3de4ad285c9a47/src/libraries/P256FCLVerifierLib.sol',
						explanation: 'MetaMask implements P256 verification using FreshCryptoLib in their delegation framework.'
					}
				]
			},
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.LEDGER]: featureSupported,
					[HardwareWalletType.TREZOR]: featureSupported,
					[HardwareWalletType.GRIDPLUS]: featureSupported,
					[HardwareWalletType.KEYSTONE]: featureSupported,
					[HardwareWalletType.KEEPKEY]: featureSupported,
				},
				ref: [
					{
						url: 'https://support.metamask.io/hc/en-us/articles/4408552261275-Hardware-Wallet-Hub',
						explanation: 'MetaMask supports Ledger, Trezor, Lattice (GridPlus), Keystone, OneKey, and KeepKey hardware wallets through their Hardware Wallet Hub.'
					}
				],
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.PARTIAL,
					details: 'MetaMask provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.'
				},
				ref: [
					{
						url: 'https://support.metamask.io/hc/en-us/articles/4408552261275-Hardware-Wallet-Hub',
						explanation: 'MetaMask Hardware Wallet Hub supports transaction signing with hardware wallets, displaying basic transaction information on the device.'
					}
				],
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://consensys.io/privacy-notice',
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
		mobile: true,
		browser: true,
		desktop: false,
		embedded: false,
	},
}
