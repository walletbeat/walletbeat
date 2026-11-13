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

const webEstimatedFeeRef: LooseReference = {
	explanation:
		'By default, the execution screen of the web app shows a single "Estimated fee" figure in the native token of the chain, with no itemized breakdown.',
	label: 'Safe web app "Estimated fee" row',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/web/src/components/tx/GasParams/index.tsx#L104-L131',
}

const webGasBreakdownRef: LooseReference = {
	explanation:
		'One click on the "Estimated fee" row expands it to show the gas limit, the maximum priority fee, and the maximum fee.',
	label: 'Safe web app network fee breakdown',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/web/src/components/tx/GasParams/index.tsx#L142-L173',
}

const webAppTransactionRequestRef: LooseReference = {
	explanation:
		'Transaction requests from apps connected through WalletConnect open the standard transaction flow of the web app. The Uniswap fee is part of the swap price, so it is not itemized.',
	label: 'Safe web app transaction requests from connected apps',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/web/src/services/safe-wallet-provider/useSafeWalletProvider.tsx#L164-L183',
}

const mobileEstimatedFeeRef: LooseReference = {
	explanation:
		'By default, the execution screen of the mobile app shows a single estimated network fee figure in the native token of the chain, with no itemized breakdown.',
	label: 'Safe mobile app estimated network fee row',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/src/features/ExecuteTx/components/EstimatedNetworkFee/EstimatedNetworkFee.tsx#L43-L67',
}

const mobileGasBreakdownRef: LooseReference = {
	explanation:
		'One tap on the fee opens a sheet that shows the maximum fee, the maximum priority fee, and the gas limit.',
	label: 'Safe mobile app network fee sheet',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/src/features/ChangeEstimatedFeeSheet/components/ChangeEstimatedFeeForm/ChangeEstimatedFeeForm.tsx#L73-L132',
}

const mobileAppTransactionRequestRef: LooseReference = {
	explanation:
		'When the user reviews a transaction request from an app connected through WalletConnect, the mobile app makes a Safe transaction and opens the confirmation screen. The Uniswap fee is part of the swap price, so it is not itemized.',
	label: 'Safe mobile app transaction requests from connected apps',
	url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/src/features/WalletConnect/Wallet/hooks/useTxRequestActions.ts#L54-L81',
}

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2026-11-13',
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
					builtInErc20Swap: supported({
						ref: [
							{
								explanation:
									'Before the user confirms a swap, the embedded swap widget lists the widget fee, any protocol fee, and the network costs as separate rows. Each row shows a token amount and, when a price is available, its value in dollars.',
								label: 'Swap widget fee rows on the review screen',
								url: 'https://github.com/cowprotocol/cowswap/blob/19660ed68e507d30df4b81494d8df5575c506ec3/apps/cowswap-frontend/src/modules/trade/containers/TradeFeesAndCosts/index.tsx#L52-L89',
							},
							{
								explanation: 'The widget fee row shows the fee percentage next to the fee name.',
								label: 'Swap widget fee row',
								url: 'https://github.com/cowprotocol/cowswap/blob/19660ed68e507d30df4b81494d8df5575c506ec3/apps/cowswap-frontend/src/modules/trade/pure/PartnerFeeRow/index.tsx#L46-L75',
							},
							{
								explanation:
									'Safe calculates the fee for each trade from its fee tiers. It gives this fee to the swap widget, together with the Safe fee recipient address.',
								label: 'Safe swap fee for each trade',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/web/src/features/swap/components/SwapWidget/index.tsx#L150-L173',
							},
							{
								explanation:
									'The Safe transaction review shows the widget fee of the swap order as a percentage.',
								label: 'Safe swap order widget fee row',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/web/src/features/swap/components/SwapOrderConfirmationView/OrderFeeConfirmationView.tsx#L23-L46',
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
								comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
								units: nonEmptySet(
									WalletServiceFeeDisplayUnit.PERCENTAGE,
									WalletServiceFeeDisplayUnit.TOKEN_AMOUNT,
									WalletServiceFeeDisplayUnit.FIAT,
								),
							},
						},
					}),
					erc20L1Transfer: supported({
						ref: [webEstimatedFeeRef, webGasBreakdownRef, safeTransactionFeesArticleRef],
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
					ethL1Transfer: supported({
						ref: [webEstimatedFeeRef, webGasBreakdownRef, safeTransactionFeesArticleRef],
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
					uniswapUSDCToEtherSwap: supported({
						ref: [webAppTransactionRequestRef, webEstimatedFeeRef, webGasBreakdownRef],
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
					erc20L1Transfer: supported({
						ref: [mobileEstimatedFeeRef, mobileGasBreakdownRef, safeTransactionFeesArticleRef],
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
					ethL1Transfer: supported({
						ref: [mobileEstimatedFeeRef, mobileGasBreakdownRef, safeTransactionFeesArticleRef],
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
					uniswapUSDCToEtherSwap: supported({
						ref: [mobileAppTransactionRequestRef, mobileEstimatedFeeRef, mobileGasBreakdownRef],
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
