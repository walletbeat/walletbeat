import { mattmatt } from '@/data/contributors/0xmattmatt'
import { danielsinclair } from '@/data/contributors/danielsinclair'
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

import { rainbowCaliburContract } from '../wallet-contracts/rainbow-calibur'

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
		contributors: [polymutex, mattmatt, danielsinclair],
		iconExtension: 'svg',
		lastUpdated: '2026-02-25',
		urls: {
			docs: ['https://rainbow.me/support'],
			extensions: [
				'https://chromewebstore.google.com/detail/rainbow/opfgelmcmbiajamepnmloijbpoleiama',
				'https://microsoftedge.microsoft.com/addons/detail/rainbow/cpojfbodiccabbabgimdeohkkpjfpbnf',
				'https://addons.mozilla.org/en-US/firefox/addon/rainbow-extension/',
			],
			repositories: [
				'https://github.com/rainbow-me/rainbow',
				'https://github.com/rainbow-me/browser-extension',
				'https://github.com/rainbow-me/delegation',
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
			eip7702: supported({
				ref: {
					explanation: 'Rainbow supports EIP-7702 delegation via Rainbow Calibur',
					url: 'https://github.com/uniswap/calibur',
				},
				contract: rainbowCaliburContract,
			}),
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
			ref: [
				{
					explanation: 'When sending, Rainbow resolves ENS domain names to addresses.',
					url: 'https://rainbow.me/support/app/send-eth',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: {
						explanation:
							'Rainbow has a built-in bridge feature that allows users to bridge assets between chains.',
						url: 'https://rainbow.me/support',
					},
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: {
					explanation:
						'Rainbow displays tokens across multiple networks in a single aggregated view with estimated portfolio value.',
					url: 'https://rainbow.me/support',
				},
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
			},
		},
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation: 'Rainbow lets users set a custom RPC endpoint for mainnet.',
					url: 'https://rainbow.me/support',
				},
			],
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: notSupported,
					erc20TokenSend: notSupported,
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: notSupported,
		}),
		ecosystem: {
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					nonDelegationTransactionDetailsIdenticalToNormalFlow: true,
				}),
				fee: {
					crossChainGas: notSupported,
					walletSponsored: notSupported,
				},
			},
		},
		integration: {
			browser: {
				ref: [
					{
						explanation: 'Rainbow browser extension supports standard Ethereum Provider APIs.',
						url: 'https://rainbow.me/support/extension/get-started-with-the-rainbow-extension',
					},
					{
						explanation:
							'The Rainbow mobile app includes a built-in dApp browser that supports standard Ethereum Provider APIs.',
						url: 'https://rainbow.me/support/app/how-to-use-the-rainbow-browser',
					},
				],
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
			ref: refTodo,
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
			accountRecovery: null,
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'Rainbow supports Ledger (via USB and Bluetooth) and Trezor (via USB) in both the browser extension and mobile app.',
						url: 'https://rainbow.me/support/extension/connect-your-hardware-wallet',
					},
					{
						explanation: 'Rainbow supports adding a Ledger wallet on mobile.',
						url: 'https://rainbow.me/support/app/add-a-wallet-from-ledger-to-rainbow',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Rainbow uses Blockaid for transaction simulation and malicious contract detection, warning users before they interact with flagged contracts.',
							url: 'https://rainbow.me/support/safety/is-rainbow-wallet-safe',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: true,
					recentContractWarning: true,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation:
								'Rainbow uses Blockaid dApp scanning to warn users before connecting to known phishing sites and wallet drainers.',
							url: 'https://rainbow.me/support/safety/avoid-crypto-scams',
						},
					],
					leaksIp: true,
					leaksUserAddress: false,
					leaksVisitedUrl: 'DOMAIN_ONLY',
				}),
				sendTransactionWarning: notSupported,
			},
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
			operationFees: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
