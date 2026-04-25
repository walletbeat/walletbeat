import { mattmatt } from '@/data/contributors/0xmattmatt'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import {
	BasicBenchmarkTransactions,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	type DisplayedBasicTransactionDetails,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

const rainbowTransactionDisplayDefault: DisplayedBasicTransactionDetails = {
	chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
	from: DataDisplayOptions.SHOWN_BY_DEFAULT,
	gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
	nonce: DataDisplayOptions.NOT_IN_UI,
	to: DataDisplayOptions.SHOWN_BY_DEFAULT,
	value: DataDisplayOptions.SHOWN_BY_DEFAULT,
}

export const rainbow: SoftwareWallet = {
	metadata: {
		id: 'rainbow',
		displayName: 'Rainbow',
		tableName: 'Rainbow',
		blurb: paragraph(`
			Rainbow Extension. Built for speed. Built for power. Built for You.
		`),
		contributors: [polymutex, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-02-08',
		urls: {
			docs: ['https://rainbowkit.com/'],
			extensions: [
				'https://chromewebstore.google.com/detail/rainbow/opfgelmcmbiajamepnmloijbpoleiama',
			],
			repositories: [
				'https://github.com/rainbow-me/browser-extension',
				'https://github.com/rainbow-me/rainbow',
			],
			socials: {
				farcaster: 'https://farcaster.xyz/rainbow',
				x: 'https://x.com/rainbowdotme',
			},
			websites: ['https://rainbow.me'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: refTodo,
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
			safe: notSupported,
		},
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: null,
		chainConfigurability: {
			// Source: Rainbow team responses via Walletbeat questionnaire
			[Variant.BROWSER]: supported<WithRef<ChainConfigurability>>({
				ref: refTodo,
				customChainRpcEndpoint: featureSupported,
				l1: supported({
					rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
					withNoConnectivityExceptL1RPCEndpoint: {
						accountCreation: featureSupported,
						accountImport: featureSupported,
						erc20BalanceLookup: featureSupported,
						erc20TokenSend: featureSupported,
						etherBalanceLookup: featureSupported,
					},
				}),
				nonL1: supported({
					rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
				}),
			}),
			[Variant.MOBILE]: null,
		},
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: notSupported,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Rainbow uses the GPL-3.0 license for its source code',
						label: 'Rainbow License File',
						url: 'https://github.com/rainbow-me/rainbow/blob/develop/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			// Source: Rainbow team responses via Walletbeat questionnaire
			ref: [
				{
					explanation: 'Rainbow fee revenue data is publicly available on DeFiLlama.',
					url: 'https://defillama.com/protocol/fees/rainbow',
				},
				{
					explanation: 'Rainbow investor information is publicly available.',
					url: 'https://investors.rainbow.me/',
				},
			],
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: true, // ~180M circulating of 1B total supply (~18% float) per CoinGecko as of 2026 04 24
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: true, // Questionnaire: fees on perpetual futures and prediction markets are not explicitly displayed
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: true, // Questionnaire: swap review sheet shows fees
				ventureCapital: true, // $18M Series A led by Seven Seven Six, $1.5M seed including Y Combinator
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://rainbow.me/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				// Rainbow supports cloud backup (iCloud/Google Drive) but not guardian-based recovery.
				guardianRecovery: notSupported,
			},
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},

			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: notSupported, // TODO: Follow up with Rainbow team
				// Source: Rainbow team responses via Walletbeat questionnaire
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: refTodo,
					leaksIp: false, // TODO: Follow up with Rainbow team to confirm
					leaksUserAddress: false, // TODO: Follow up with Rainbow team to confirm
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: notSupported, // TODO: Follow up with Rainbow team
			},

			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				calldataDisplay: {
					copyHexToClipboard: true,
					formatted: false,
					rawHex: true,
				},
				messageSigningLegibility: {
					[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
					[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
					[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
					[MessageSigningDetails.SAFE_HASH]: DataDisplayOptions.NOT_IN_UI,
				},
				transactionDetailsDisplay: {
					[BasicBenchmarkTransactions.ETH_TRANSFER]: rainbowTransactionDisplayDefault,
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						...rainbowTransactionDisplayDefault,
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						...rainbowTransactionDisplayDefault,
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						...rainbowTransactionDisplayDefault,
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: rainbowTransactionDisplayDefault,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						...rainbowTransactionDisplayDefault,
						calldataDecoded: DataDisplayOptions.NOT_IN_UI,
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						...rainbowTransactionDisplayDefault,
						calldataDecoded: DataDisplayOptions.NOT_IN_UI,
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						...rainbowTransactionDisplayDefault,
						calldataDecoded: DataDisplayOptions.NOT_IN_UI,
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							...rainbowTransactionDisplayDefault,
							calldataDecoded: DataDisplayOptions.NOT_IN_UI,
							transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
						},
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						...rainbowTransactionDisplayDefault,
						failure: 'DETECTED',
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
						...rainbowTransactionDisplayDefault,
						nondeterminism: 'STATIC_SINGLE_OUTCOME',
					},
				},
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				builtInErc20Swap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				erc20L1Transfer: null,
				ethL1Transfer: null,
				uniswapUSDCToEtherSwap: null,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
