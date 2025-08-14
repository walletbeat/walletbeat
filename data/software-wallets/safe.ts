import { nconsigny } from '@/data/contributors/nconsigny'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { ackee } from '../entities/ackee'
import { certora } from '../entities/certora'

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
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: supported({
				contract: {
					name: 'Safe',
					address: '0x0000000000000000000000000000000000000000',
					eip7702Delegatable: false,
					methods: {
						isValidSignature: supported({}),
						validateUserOp: supported({}),
					},
					sourceCode: {
						available: true,
						ref: {
							explanation: 'Safe uses the GPL-3.0 license for its source code',
							label: 'Safe License File',
							url: 'https://github.com/safe-global/safe-smart-account',
						},
					},
				},
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
		chainConfigurability: {
			customChains: false,
			l1RpcEndpoint: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
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
			eip5792: supported({
				ref: {
					explanation: 'Safe supports EIP-5792 for transaction batching.',
					url: 'https://github.com/safe-global/safe-modules/tree/main/modules/batching',
				},
			}),
		},
		license: {
			license: License.GPL_3_0,
			ref: [
				{
					explanation: 'Safe uses the LGPL-3.0 license for its source code',
					label: 'Safe License File',
					url: 'https://github.com/safe-global/safe-wallet-monorepo',
				},
			],
			walletCall: null,
		},
		monetization: {
			ref: [
				{
					explanation:
						'SafeDAO has received ecosystem grants; example Optimism grant proposal in the Optimism governance forum.',
					url: 'https://gov.optimism.io/t/draft-gf-phase-1-proposal-old-template-safe/3400',
				},
				{
					explanation:
						'Safe community updates covering grants and RPGF-related support across ecosystems.',
					url: 'https://forum.safe.global/t/safedao-community-updates/4213',
				},
				{
					explanation:
						'Community‑Aligned Fees: revenue (e.g., Native Swaps) pledged to SafeDAO; fee approach is explained publicly.',
					url: 'https://safe.global/blog/safedao-community-aligned-fees-introduction',
				},
				{
					explanation:
						'SAFE tokenomics and governance scope; currently primarily used for SafeDAO treasury resource allocation (e.g., grants).',
					url: 'https://safe.global/blog/safe-tokenomics',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: true,
				ventureCapital: null,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://safe.global/privacy',
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
			publicSecurityAudits: [
				{
					auditDate: '2025-01-14',
					auditor: certora,
					ref: 'https://github.com/safe-global/safe-smart-account/blob/main/docs/Safe_Audit_Report_1_5_0_Certora.pdf',
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-05-28',
					auditor: ackee,
					ref: 'https://github.com/safe-global/safe-smart-account/blob/main/docs/Safe_Audit_Report_1_5_0_Ackee.pdf',
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					contractRegistry: true, //blockaid
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true, //blockaid
				}),
				scamUrlWarning: supported({
					leaksIp: true,
					leaksUserAddress: true,
					leaksVisitedUrl: 'FULL_URL',
				}),
				sendTransactionWarning: supported({
					leaksRecipient: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					newRecipientWarning: true, //blockaid
					userWhitelist: true,
				}),
			},
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			feeTransparency: {
				disclosesWalletFees: true,
				level: FeeTransparencyLevel.DETAILED,
				showsTransactionPurpose: true,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
