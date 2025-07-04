import { nconsigny } from '@/data/contributors/nconsigny'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		blurb: paragraph(`
			Safe (formerly Gnosis Safe) is a smart contract wallet focused on secure asset management
			with multi-signature functionality for individuals and organizations.
		`),
		contributors: [nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/safe-global',
		url: 'https://safe.global',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.erc4337,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			erc4337: supported({
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					explanation: 'Safe supports ERC-4337 via their 4337 module implementation',
					url: 'https://github.com/safe-global/safe-modules/tree/master/4337',
				},
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
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
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
			eip5792: null,
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
			privacyPolicy: 'https://safe.global/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				stealthAddresses: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: {
					explanation:
						'Safe natively supports Ledger and Trezor over USB, and Keystone and GridPlus Lattice1 via QR / WalletConnect; any other hardware wallet that works through MetaMask or a similar connector can also act as a Safe signer.',
					url: 'https://help.safe.global/en/articles/40824-what-hardware-wallets-are-supported',
				},
				supportedWallets: {
					[HardwareWalletType.LEDGER]: supported({
						[HardwareWalletConnection.webUSB]: supported({
							ref: {
								explanation: 'Safe natively supports Ledger hardware wallets over USB connection.',
								url: 'https://help.safe.global/en/articles/40824-what-hardware-wallets-are-supported',
							},
						}),
					}),
					[HardwareWalletType.TREZOR]: supported({
						[HardwareWalletConnection.WALLET_CONNECT]: supported({
							ref: {
								explanation: 'Safe supports Trezor hardware wallets via WalletConnect.',
								url: 'https://help.safe.global/en/articles/40824-what-hardware-wallets-are-supported',
							},
						}),
					}),
					[HardwareWalletType.KEYSTONE]: supported({
						[HardwareWalletConnection.WALLET_CONNECT]: supported({
							ref: {
								explanation: 'Safe supports Keystone hardware wallets via QR code / WalletConnect.',
								url: 'https://help.safe.global/en/articles/40824-what-hardware-wallets-are-supported',
							},
						}),
					}),
					[HardwareWalletType.GRIDPLUS]: supported({
						[HardwareWalletConnection.WALLET_CONNECT]: supported({
							ref: {
								explanation:
									'Safe supports GridPlus Lattice1 hardware wallets via QR code / WalletConnect.',
								url: 'https://help.safe.global/en/articles/40824-what-hardware-wallets-are-supported',
							},
						}),
					}),
				},
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				details: 'Safe uses FreshCryptoLib for passkey verification in their 4337 modules.',
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl:
					'https://github.com/safe-global/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
				ref: [
					{
						url: 'https://github.com/safe-global/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
					},
					{
						explanation: 'Safe uses FCL P256 verifier for passkey verification.',
						url: 'https://github.com/safe-global/safe-modules/blob/main/modules/passkey/contracts/verifiers/FCLP256Verifier.sol',
					},
				],
			},
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
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
