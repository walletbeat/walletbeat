import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { cure53 } from '../entities/cure53'
import { cyfrin } from '../entities/cyfrin'
import { diligence } from '../entities/diligence'
import { metamask7702DelegatorContract } from '../wallet-contracts/metamask-7702-delegator'

export const metamask: SoftwareWallet = {
	metadata: {
		id: 'metamask',
		displayName: 'MetaMask',
		tableName: 'MetaMask',
		blurb: paragraph(`
			MetaMask is a popular Ethereum wallet created by Consensys and that has
			been around for a long time. It is a jack-of-all-trades wallet that can
			be extended through MetaMask Snaps.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-02-08',
		repoUrl: 'https://github.com/MetaMask/metamask-extension',
		url: 'https://metamask.io',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				contract: metamask7702DelegatorContract,
			}),
			eoa: supported({
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
		},
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
			ref: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
			walletCall: null,
		},
		license: {
			[Variant.BROWSER]: {
				license: License.PROPRIETARY_SOURCE_AVAILABLE,
				ref: {
					explanation:
						'The MetaMask browser extension uses a proprietary source-available license.',
					url: 'https://github.com/MetaMask/metamask-extension/blob/main/LICENSE',
				},
			},
			[Variant.MOBILE]: {
				license: License.PROPRIETARY_SOURCE_AVAILABLE,
				ref: {
					explanation: 'The MetaMask mobile app uses a proprietary source-available license.',
					url: 'https://github.com/MetaMask/metamask-mobile/blob/main/LICENSE',
				},
			},
		},
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
			privacyPolicy: 'https://consensys.io/privacy-notice',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'MetaMask supports Ledger, Trezor, Lattice (GridPlus), Keystone, OneKey, and KeepKey hardware wallets through their Hardware Wallet Hub.',
						url: 'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/',
					},
				],
				supportedWallets: {
					[HardwareWalletType.LEDGER]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
					}),
					[HardwareWalletType.TREZOR]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
					}),
					[HardwareWalletType.GRIDPLUS]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
					}),
					[HardwareWalletType.KEYSTONE]: supported({
						[HardwareWalletConnection.QR]: featureSupported,
					}),
				},
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: {
				details:
					'MetaMask uses Smooth Crypto lib for passkey verification in their delegation framework.',
				library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
				libraryUrl: 'https://github.com/MetaMask/delegation-framework/tree/main/lib',
				ref: [
					{
						explanation:
							'MetaMask implements P256 verification using Smooth Crypto lib in their delegation framework.',
						url: 'https://github.com/MetaMask/delegation-framework/commit/8641eccdedf486832e66e589b8a9bcfd44d00104',
					},
				],
			},
			publicSecurityAudits: [
				{
					auditDate: '2024-10-25',
					auditor: diligence,
					codeSnapshot: {
						date: '2024-10-25',
					},
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/21m4LE3WLYbgWjc33aDcp2/8252073e115688b1dc1500a9c2d33fe4/metamask-delegator-framework-audit-2024-10.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-10-25',
					auditor: cure53,
					codeSnapshot: {
						date: '2024-03-25',
					},
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/4sNMB55kkGw6BtAiIn08mm/f1f4a78d3901dd03848d070e15a1ff12/pentest-report_metamask-signing-snap.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-03-18',
					auditor: cyfrin,
					codeSnapshot: {
						date: '2025-02-07',
					},
					ref: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-03-18-cyfrin-Metamask-DelegationFramework1-v2.0.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-04-01',
					auditor: cyfrin,
					codeSnapshot: {
						date: '2025-04-01',
					},
					ref: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-04-01-cyfrin-Metamask-DelegationFramework2-v2.0.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
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
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
