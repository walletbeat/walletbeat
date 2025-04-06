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
import { diligence } from '../entities/diligence'
import { cure53 } from '../entities/cure53'
import { Variant } from '@/schema/variants'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

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
			details: 'Supports EOA with 7702 delegation',
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
			passkeyVerification: {
				library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
				libraryUrl: 'https://github.com/MetaMask/delegation-framework/tree/main/lib',
				details:
					'MetaMask uses Smooth Crypto lib for passkey verification in their delegation framework.',
				ref: [
					{
						url: 'https://github.com/MetaMask/delegation-framework/commit/8641eccdedf486832e66e589b8a9bcfd44d00104',
						explanation:
							'MetaMask implements P256 verification using Smooth Crypto lib in their delegation framework.',
					},
				],
			},
			scamAlerts: null,
			publicSecurityAudits: [
				{
					auditor: diligence,
					auditDate: '2024-10-25',
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/21m4LE3WLYbgWjc33aDcp2/8252073e115688b1dc1500a9c2d33fe4/metamask-delegator-framework-audit-2024-10.pdf',
					variantsScope: 'ALL_VARIANTS',
					codeSnapshot: {
						date: '2024-10-25',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: cure53,
					auditDate: '2024-10-25',
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/4sNMB55kkGw6BtAiIn08mm/f1f4a78d3901dd03848d070e15a1ff12/pentest-report_metamask-signing-snap.pdf',
					variantsScope: 'ALL_VARIANTS',
					codeSnapshot: {
						date: '2024-03-25',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
			],
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
						url: 'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/',
						explanation:
							'MetaMask supports Ledger, Trezor, Lattice (GridPlus), Keystone, OneKey, and KeepKey hardware wallets through their Hardware Wallet Hub.',
					},
				],
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.PARTIAL,
					details:
						'MetaMask provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.',
				},
				ref: [
					{
						url: 'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/',
						explanation:
							'MetaMask Hardware Wallet Hub supports transaction signing with hardware wallets, displaying basic transaction information on the device.',
					},
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
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
