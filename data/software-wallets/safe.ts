import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { ackee } from '@/data/entities/ackee'
import { certora } from '@/data/entities/certora'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
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
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import {
	FeeDisplayLevel,
	FeeType,
	type OperationFeeDisplay,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license' // assuming path
import {
	type ArtifactSigningDetails,
	RepositoryChangeControlState,
} from '@/schema/features/transparency/release-transparency'
import { type LooseReference, refNotNecessary, refTodo, type WithRef } from '@/schema/reference'
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
		contributors: [nconsigny, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-11-23',
		urls: {
			docs: ['https://docs.safe.global/'],
			repositories: [
				'https://github.com/safe-global/safe-wallet-monorepo',
				'https://github.com/safe-fndn',
			],
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
			[Variant.BROWSER]: {
				ref: [
					{
						explanation:
							"The address field looks up ENS names on Ethereum through the app's own node connection, or through the user's custom node if one is set.",
						urls: [
							{
								label: 'Name resolver hook',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/components/common/AddressInput/useNameResolver.ts#L21-L36',
							},
							{
								label: 'ENS hub provider',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/hooks/useEnsHubProvider.ts#L31-L45',
							},
							{
								label: 'ENS resolution',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/ens.ts#L67-L82',
							},
						],
					},
					{
						explanation:
							'An address with a network prefix is accepted only when the prefix matches the current network. Other chain-specific address formats are not recognized.',
						urls: [
							{
								label: 'Prefix parsing',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/addresses.ts#L37-L54',
							},
							{
								label: 'Prefix validation',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/validation.ts#L20-L32',
							},
						],
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
			[Variant.MOBILE]: {
				ref: [
					{
						explanation:
							'The send and address book fields accept only plain addresses, not ENS names.',
						urls: [
							{
								label: 'Recipient validation',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/Send/hooks/useRecipientValidation.ts#L51-L62',
							},
							{
								label: 'Contact schema',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/AddressBook/Contact/schemas/contactSchema.ts#L13-L28',
							},
						],
					},
				],
				chainSpecificAddressing: {
					erc7828: notSupported,
					erc7831: notSupported,
				},
				nonChainSpecificEnsResolution: notSupported,
			},
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
						explanation: 'The Safe{Wallet} web and mobile apps are licensed under GPL-3.0.',
						label: 'Safe License File',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/LICENSE#L1-L2',
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
						'Safe, then called Gnosis Safe, raised $100 million in 2022 in a round led by the venture firm 1kx.',
					label: 'Safe funding announcement',
					url: 'https://safefoundation.org/blog/gnosis-safe-raises-usd100-million-led-by-1kx-to-unlock-digital-asset',
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
				ventureCapital: true,
			},
		},
		multiAddress: supported({
			ref: [
				{
					explanation:
						'Both apps keep a list of Safe accounts, and users can create or add existing accounts.',
					urls: [
						{
							label: 'Web: accounts list',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/features/myAccounts/components/AccountsHeader/index.tsx#L54-L69',
						},
						{
							label: 'Mobile: add existing account',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/AccountsSheet/MyAccounts/MyAccountsFooter.tsx#L29-L37',
						},
					],
				},
			],
		}),
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
				ethereumL1: notSupportedWithRef({
					ref: [
						{
							explanation:
								'With its Ethereum RPC set to a test proxy that reports false ERC-20 balances, Safe shows the real balance of 1.99988 USDC. Safe does not get token balances from the RPC endpoint.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-usdc-balance.png',
							label: 'Safe web app asset list showing 1.99988 USDC',
						},
						{
							explanation:
								'The maximum amount that Safe lets the user send is the real balance of 1.999883 USDC.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-send-usdc.png',
							label: 'Safe web app send screen for USDC',
						},
						{
							explanation:
								'The Ethereum RPC provider is set to a local test proxy that reports false ERC-20 balances.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-custom-rpc.png',
							label: 'Safe web app Environment variables page with a custom RPC provider',
						},
						{
							explanation:
								'Safe sends `eth_chainId`, `eth_getCode`, `eth_call` and `eth_accounts` requests through the proxy. None of them is an ERC-20 balance query, so the proxy does not change a balance.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-lying-proxy-log.png',
							label: 'Log of the lying RPC proxy during the Safe test',
						},
						{
							explanation:
								'Safe loads token balances from the Safe Client Gateway at `safe-client.safe.global`, not from the RPC endpoint that the user sets.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-balance-request.png',
							label: 'Browser network log of the Safe balance request',
						},
						{
							explanation:
								'The Safe Client Gateway returns the USDC balance as 1999883 base units, which is 1.999883 USDC. Safe shows this value with no verification against the chain.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-balance-response.png',
							label: 'Safe Client Gateway response with the USDC balance',
						},
						{
							explanation:
								'Safe gets token balances from the balances endpoint of the Safe Client Gateway.',
							label: 'Safe balance query to the Safe Client Gateway',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/ad1f9fd9d9b1ef2885aad0e6fec56ee051067f88/packages/store/src/gateway/AUTO_GENERATED/balances.ts#L1-L18',
						},
					],
				}),
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
				artifactSigning: {
					[Variant.BROWSER]: supported<ArtifactSigningDetails>({
						ref: [
							{
								explanation:
									"Safe's release system signs each web release and publishes a signed record of the release archive on the public Sigstore log.",
								urls: [
									{
										label: 'Signed release tag',
										url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml#L69-L71',
									},
									{
										label: 'Release archive attestation',
										url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml#L206-L213',
									},
								],
							},
						],
						publication: 'SIGSTORE_REKOR',
						signer: 'BUILD_INFRA_IDENTITY',
					}),
					[Variant.MOBILE]: notSupported,
				},
				dependencyAgeGate: null,
				dependencyLocking: supported({
					ref: {
						explanation:
							'The release build installs the exact dependency versions recorded in the repository and fails if they would change.',
						label: 'Dependency install step',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/actions/yarn/action.yml#L48-L51',
					},
				}),
				dependencySandboxing: notSupportedWithRef({
					ref: {
						explanation:
							'Dependencies are not isolated from each other or from the app when it runs. This setting only stops dependencies from running scripts during installation.',
						label: 'Install scripts setting',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.yarnrc.yml#L7',
					},
				}),
				dependencyVulnerabilityScanning: supported<WithRef<{}>>({
					ref: {
						explanation:
							'Dependabot watches dependencies for known security flaws and opens updates to fixed versions, as in these examples.',
						urls: [
							{
								label: 'Security update for `fast-uri`',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/pull/8829',
							},
							{
								label: 'Security update for `proxy-addr`',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/pull/8964',
							},
						],
					},
				}),
				hasPublicChangelog: {
					[Variant.BROWSER]: supported({
						ref: {
							label: 'Safe{Wallet} releases',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/releases',
						},
					}),
					[Variant.MOBILE]: supported({
						ref: {
							explanation: 'Each Safe{Mobile} version on the App Store comes with release notes.',
							label: 'Safe{Mobile} on the App Store',
							url: 'https://apps.apple.com/us/app/safe-mobile/id6748754793',
						},
					}),
				},
				hermeticBuilds: notSupported,
				repositoryChangeControls: {
					ref: [
						{
							explanation:
								'The main branch, which releases are built from, cannot be deleted or force-pushed, and changes must go through a pull request. Its public rules do not require an approving review or passing checks.',
							label: 'Rules for the main branch',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/rules/15670114',
						},
						{
							explanation: 'Release tags cannot be deleted or moved.',
							label: 'Rules for tags',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/rules/16698869',
						},
					],
					branchDeletionBlocked: RepositoryChangeControlState.VERIFIABLY_PRESENT,
					forcePushBlocked: RepositoryChangeControlState.VERIFIABLY_PRESENT,
					requiredChecks: RepositoryChangeControlState.UNVERIFIABLE,
					requiredReview: RepositoryChangeControlState.UNVERIFIABLE,
					tagsImmutable: RepositoryChangeControlState.VERIFIABLY_PRESENT,
				},
				reproducibleBuilds: notSupported,
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
