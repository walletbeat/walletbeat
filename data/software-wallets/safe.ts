import { nconsigny } from '@/data/contributors/nconsigny'
import { ackee } from '@/data/entities/ackee'
import { certora } from '@/data/entities/certora'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { type ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import {
	CallDataDisplay,
	DataDisplayOptions,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	FeeDisplayLevel,
	FeeType,
	type OperationFeeDisplay,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license' // assuming path
import { type LooseReference, refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { nonEmptySet } from '@/types/utils/non-empty'

const safeTransactionFeesArticleRef: LooseReference = {
	explanation: 'Safe states that transaction fees go to the blockchain network and not to Safe.',
	label: 'Safe help center article on transaction fees',
	url: 'https://help.safe.global/articles/1896549699-transaction-fees',
}

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2026-11-18',
		urls: {
			docs: ['https://docs.safe.global/'],
			repositories: ['https://github.com/safe-fndn'],
			websites: ['https://safe.global'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: refTodo,
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: refNotNecessary,
				canDeployNew: true,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				supportedOwners: 'ANY_NUMBER_OF_SIGNERS',
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
		},
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: supported({
			ref: refTodo,
			customChainRpcEndpoint: notSupported,
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
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': null,
				'2700': null,
				'6963': null,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Safe uses the LGPL-3.0 license for its source code',
						label: 'Safe License File',
						url: 'https://github.com/safe-global/safe-wallet-monorepo',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'SafeDAO has received ecosystem grants. This Optimism governance forum post is an example grant proposal.',
					url: 'https://gov.optimism.io/t/draft-gf-phase-1-proposal-old-template-safe/3400',
				},
				{
					explanation:
						'Safe community updates covering grants and RPGF-related support across ecosystems.',
					url: 'https://forum.safe.global/t/safedao-community-updates/4213',
				},
				{
					explanation:
						'Community‑Aligned Fees: revenue (e.g., Native Swaps) pledged to SafeDAO. The fee approach is explained publicly.',
					url: 'https://safefoundation.org/blog/safedao-community-aligned-fees-introduction',
				},
				{
					explanation:
						'SAFE tokenomics and governance scope. The token is currently used primarily for SafeDAO treasury resource allocation (e.g., grants).',
					url: 'https://safefoundation.org/blog/safe-tokenomics',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: false,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://safe.global/privacy',
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
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: supported({
				ref: [
					{
						url: 'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
					},
					{
						explanation: 'Safe uses FCL P256 verifier for passkey verification.',
						url: 'https://github.com/safe-fndn/safe-modules/blob/1e57772571fc72471b7bc3203fde9b1799fb87d4/modules/passkey/contracts/verifiers/FCLP256Verifier.sol#not-line-specific',
					},
				],
				details: 'Safe uses FreshCryptoLib for passkey verification in their 4337 modules.',
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl:
					'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
			}),
			publicSecurityAudits: [
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Certora.pdf#binary-file',
					auditDate: '2025-01-14',
					auditor: certora,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Ackee.pdf#binary-file',
					auditDate: '2025-05-28',
					auditor: ackee,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: refTodo,
					contractRegistry: true, //blockaid
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true, //blockaid
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: refTodo,
					leaksUserAddress: true,
					leaksUserIp: true,
					leaksVisitedUrl: 'FULL_URL',
				}),
				sendTransactionWarning: supported({
					ref: refTodo,
					addressPoisoningDetection: false,
					leaksRecipient: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					newRecipientWarning: true, //blockaid
					userWhitelist: true,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: null,
				erc8213: supported({
					ref: refTodo,
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: null,
				}),
				transactionDetailsDisplay: displaysFullTransactionDetails,
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				[Variant.BROWSER]: {
					builtInErc20Swap: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'When the swap widget first opens, it shows one cost figure in dollars next to the exchange rate. It does not itemize the widget fee or the network costs.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-swap-default.png',
								label: 'Safe web app swap widget for a swap from USDC, as it first opens',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One click on the exchange rate row opens the fee details. They show the widget fee as a percentage, and the widget fee and the network costs as token amounts with their value in dollars.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-swap-fees-expanded.png',
								label: 'Safe web app swap widget with the fee details opened',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'The Safe transaction review for the swap order shows the widget fee as a percentage. The network costs of the order are part of the minimum amount received, so they are not itemized.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-swap-order-review.png',
								label: 'Safe web app review of the swap order with the widget fee row',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'Safe lists the widget fee tiers. It states that the fee percentage is always visible in the interface, and that part of the fee goes to the Safe Foundation.',
								label: 'Safe help center article on the native swap widget fee',
								url: 'https://help.safe.global/articles/9969629388-how-does-the-widget-fee-work-for-native-swaps',
							},
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: true,
								[FeeType.WALLET_FEE]: true,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(
									WalletServiceFeeDisplayUnit.PERCENTAGE,
									WalletServiceFeeDisplayUnit.TOKEN_AMOUNT,
									WalletServiceFeeDisplayUnit.FIAT,
								),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(
									WalletServiceFeeDisplayUnit.PERCENTAGE,
									WalletServiceFeeDisplayUnit.FIAT,
								),
							},
						},
					}),
					erc20L1Transfer: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'By default, the USDC send screen shows a single "Estimated fee" figure in ETH, with no breakdown.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-erc20-send-fee-default.png',
								label: 'Safe web app USDC send screen with the "Estimated fee" row closed',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One click on the "Estimated fee" row opens it. It shows the gas limit, the maximum priority fee, and the maximum fee.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-erc20-send-fee-expanded.png',
								label: 'Safe web app USDC send screen with the "Estimated fee" row opened',
								lastRetrieved: '2026-11-18',
							},
							safeTransactionFeesArticleRef,
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: false,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
					ethL1Transfer: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'By default, the ETH send screen shows a single "Estimated fee" figure in ETH, with no breakdown.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-eth-send-fee-default.png',
								label: 'Safe web app ETH send screen with the "Estimated fee" row closed',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One click on the "Estimated fee" row opens it. It shows the gas limit, the maximum priority fee, and the maximum fee.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-eth-send-fee-expanded.png',
								label: 'Safe web app ETH send screen with the "Estimated fee" row opened',
								lastRetrieved: '2026-11-18',
							},
							safeTransactionFeesArticleRef,
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: false,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
					uniswapUSDCToEtherSwap: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'The request from Uniswap shows the USDC approval, the `Permit2` approval, and the Uniswap router call. Its fee section shows that Safe charges no execution fee, and shows a single maximum gas fee in ETH. The Uniswap fee is part of the swap price, so it is not itemized.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-uniswap-swap-request.png',
								label: 'Safe web app request from Uniswap for a USDC to ETH swap',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'By default, the execution screen for the swap shows a single "Estimated fee" figure in ETH, with no breakdown.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-uniswap-swap-fee-default.png',
								label:
									'Safe web app execution screen for the Uniswap swap with the "Estimated fee" row closed',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One click on the "Estimated fee" row opens it. It shows the gas limit, the maximum priority fee, and the maximum fee.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-web-uniswap-swap-fee-expanded.png',
								label:
									'Safe web app execution screen for the Uniswap swap with the "Estimated fee" row opened',
								lastRetrieved: '2026-11-18',
							},
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: true,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
				},
				[Variant.MOBILE]: {
					builtInErc20Swap: notSupported,
					erc20L1Transfer: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'By default, the USDC send screen of the Android app shows a single estimated network fee in ETH, with no breakdown. It also shows that Safe charges no execution fee.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-erc20-send-fee-default.png',
								label: 'Safe Android app USDC send screen with the estimated network fee',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One tap on the network fee opens a sheet that shows the maximum fee, the maximum priority fee, and the gas limit.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-erc20-send-fee-expanded.png',
								label: 'Safe Android app network fee sheet for the USDC send',
								lastRetrieved: '2026-11-18',
							},
							safeTransactionFeesArticleRef,
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: false,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
					ethL1Transfer: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'By default, the ETH send screen of the Android app shows a single estimated network fee in ETH, with no breakdown. It also shows that Safe charges no execution fee.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-eth-send-fee-default.png',
								label: 'Safe Android app ETH send screen with the estimated network fee',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One tap on the network fee opens a sheet that shows the maximum fee, the maximum priority fee, and the gas limit.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-eth-send-fee-expanded.png',
								label: 'Safe Android app network fee sheet for the ETH send',
								lastRetrieved: '2026-11-18',
							},
							safeTransactionFeesArticleRef,
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: false,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
					uniswapUSDCToEtherSwap: supported<OperationFeeDisplay>({
						ref: [
							{
								explanation:
									'The request from Uniswap shows the Ethereum network, three actions, and the USDC and ETH balance changes. Its fee section shows that Safe charges no execution fee. The Uniswap fee is part of the swap price, so it is not itemized.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-uniswap-swap-request.png',
								label: 'Safe Android app request from Uniswap for a USDC to ETH swap',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'By default, the execution screen for the swap shows a single estimated network fee in ETH, with no breakdown.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-uniswap-swap-fee-default.png',
								label: 'Safe Android app execution screen for the Uniswap swap',
								lastRetrieved: '2026-11-18',
							},
							{
								explanation:
									'One tap on the network fee opens a sheet that shows the maximum fee, the maximum priority fee, and the gas limit.',
								file: 'public/references/wallets/safe/screenshots/2026-11-18-safe-android-uniswap-swap-fee-expanded.png',
								label: 'Safe Android app network fee sheet for the Uniswap swap',
								lastRetrieved: '2026-11-18',
							},
						],
						fees: {
							feesInvolved: {
								[FeeType.NETWORK_FEE]: true,
								[FeeType.ONCHAIN_APP_FEE]: true,
								[FeeType.WALLET_FEE]: false,
							},
							shownAfterSingleAction: {
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
							shownByDefault: {
								comprehensiveness: FeeDisplayLevel.AGGREGATED,
								units: nonEmptySet(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT),
							},
						},
					}),
				},
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: {
				explanation: 'Safe supports EIP-5792 for transaction batching.',
				url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/f918ceb9b561dd3a27af96903071cd56c1fb5ddd/apps/web/src/services/safe-wallet-provider/index.ts#L184',
			},
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
