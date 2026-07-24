import { mattmatt } from '@/data/contributors/0xmattmatt'
import { jiojosbg } from '@/data/contributors/jiojosbg'
import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { ren2140 } from '@/data/contributors/ren2140'
import type { SoftwareWallet } from '@/data/software-wallets'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	EntityRole,
	MultiAddressPolicy,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type {
	ContractTransactionWarning,
	ScamUrlWarning,
	SendTransactionWarning,
} from '@/schema/features/security/scam-alerts'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import {
	FeeDisplayLevel,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { type References, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { paragraph } from '@/types/content'
import { nonEmptySet } from '@/types/utils/non-empty'

import { ambireEntity } from '../entities/ambire'
import { biconomy } from '../entities/biconomy'
import { citrea } from '../entities/citrea'
import { github } from '../entities/github'
import { hunterSecurity } from '../entities/hunter-security'
import { lifi } from '../entities/lifi'
import { monad } from '../entities/monad'
import { pashov } from '../entities/pashov-audit-group'
import { pimlico } from '../entities/pimlico'
import { sentry } from '../entities/sentry'
import { ambireAccountContract } from '../wallet-contracts/ambire-account'
import { ambireDelegatorContract } from '../wallet-contracts/ambire-delegator'
import ambireRawExtManifest from './manifests/ambire/ehgjhhccekdedpbkifaojjaefeohnoea.manifest.json'

const v2Audits: SecurityAudit[] = [
	{
		ref: 'https://github.com/AmbireTech/ambire-common/blob/4be3dfec816cdd11039c1d260943a1a98affdc92/audits/Pashov-Ambire-third-security-review.md',
		auditDate: '2024-01-26',
		auditor: pashov,
		codeSnapshot: {
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
			date: '2023-11-08',
		},
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		ref: 'https://github.com/AmbireTech/ambire-common/blob/2bf3233cd22c28eca7f87a6ef997325936ca3214/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
		auditDate: '2025-02-20',
		auditor: hunterSecurity,
		codeSnapshot: {
			commit:
				'https://github.com/AmbireTech/ambire-common/commit/de88e26041db8777468f384e56d5ad0cb96e29a5',
			date: '2025-02-17',
		},
		unpatchedFlaws: 'NONE_FOUND',
		variantsScope: { [Variant.BROWSER]: true },
	},
]

const dataLeakReferences: Record<string, References> = {
	ambire: [
		{
			explanation:
				"All RPC traffic for default chains passes through Ambire's proxy - Invictus RPC",
			url: 'https://invictus.ambire.com',
		},
		{
			explanation:
				"Token prices and additional token info are fetched from Ambire's 'cena' service.",
			url: 'https://cena.ambire.com',
		},
		{
			explanation:
				"Ambire's backend is responsible for features such as the Gas Tank, Velcro (for finding your tokens), finding linked account and others.",
			url: 'https://relayer.ambire.com',
		},
		{
			explanation:
				'Ambire does a single batch request for token discovery on multiple chains for a single account. This feature utilizes the Ambire relayer.',
			lastRetrieved: '2025-07-28',
			urls: [
				{
					label: 'A single account-network pair is queued',
					url: 'https://github.com/AmbireTech/ambire-common/blob/729f19c91bf07d49b78f22dcf30822c88587bd2a/src/libs/portfolio/portfolio.ts#L146-L150',
				},
				{
					label:
						"All the queued requests are batched. Since the debounce time is 0, only queue elements requested 'at the same time' get batched together",
					url: 'https://github.com/AmbireTech/ambire-common/blob/729f19c91bf07d49b78f22dcf30822c88587bd2a/src/libs/portfolio/batcher.ts#L143',
				},
			],
		},
		{
			explanation: "Ambire's NFT CDN is responsible for fetching NFT media.",
			url: 'https://nftcdn.ambire.com',
		},
	],
	biconomy: [
		{
			explanation: 'Biconomy is used as a Bundler.',
			url: 'https://bundler.biconomy.io',
		},
	],
	github: [
		{
			explanation: 'Used for static content and info lists.',
			url: ['https://raw.githubusercontent.com', 'https://github.com', 'https://api.github.com'],
		},
	],
	lifi: [
		{
			explanation: 'Ambire uses LiFi as bridge and swap API.',
			url: 'https://li.quest',
		},
	],
	pimlico: [
		{
			explanation: 'Pimlico is used as a Bundler and gas estimation helper.',
			url: 'https://api.pimlico.io',
		},
	],
}

const scamAlertsAndSendTxWarningRefs: WithRef<{}>['ref'] = [
	{
		explanation:
			'When interacting with a new address, the extension fetches info about that address from an external Ambire API.',
		lastRetrieved: '2026-01-29',
		urls: [
			{
				label: 'Implementation',
				url: 'https://github.com/AmbireTech/ambire-common/blob/2216ea165a56b01ccb76ab2895fa1295577af10e/src/controllers/phishing/phishing.ts',
			},
		],
	},
	{
		explanation:
			'When attempting to send tokens via the built-in interface, Ambire displays warning based on the time since last transfer.',
		lastRetrieved: '2026-01-29',
		url: {
			label: 'Implementation',
			url: 'https://github.com/AmbireTech/ambire-common/blob/389365fa505b4a32ac378bdf64d59752160ae8eb/src/services/validations/validate.ts#L122-L133',
		},
	},
]

export const ambire: SoftwareWallet = {
	metadata: {
		id: 'ambire',
		displayName: 'Ambire',
		tableName: 'Ambire',
		blurb: paragraph(`
			The first hybrid Account abstraction wallet to support Basic (EOA) and Smart accounts, 
			improving security and user experience.
			`),
		contributors: [jiojosbg, nconsigny, mattmatt, polymutex, ren2140],
		iconExtension: 'svg',
		lastUpdated: '2026-07-22',
		urls: {
			docs: ['https://help.ambire.com/hc/en-us'],
			extensions: [
				'https://chromewebstore.google.com/detail/ambire-web3-wallet/ehgjhhccekdedpbkifaojjaefeohnoea',
			],
			repositories: ['https://github.com/AmbireTech/extension'],
			socials: {
				discord: 'https://discord.com/invite/ambire',
				reddit: 'https://www.reddit.com/r/Ambire_Wallet/',
				telegram: 'https://t.me/AmbireOfficial',
				x: 'https://x.com/ambire',
				youtube: 'https://www.youtube.com/@AmbireTech',
			},
			websites: ['https://www.ambire.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eip7702: supported({
				ref: {
					explanation:
						'Ambire is AA wallet by default. With the introduction of EIP-7702 it allows you to use your existing EOA just like you would use any smart account wallet!',
					url: 'https://blog.ambire.com/eip-7702-wallet/',
				},
				contract: ambireDelegatorContract,
			}),
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: true,
				canExportSeedPhrase: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: supported({
				ref: {
					explanation: 'Ambire supports ERC-4337 smart contract wallets',
					url: 'https://github.com/AmbireTech/ambire-common/blob/4cce586884a8224a8ea2a696150207ad37680dc9/contracts/AmbireAccount.sol',
				},
				contract: ambireAccountContract,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: {
					explanation: 'Ambire Extension Now Supports Safe Accounts',
					url: 'https://blog.ambire.com/ambire-supports-safe-accounts/',
				},
				canDeployNew: false,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration: TransactionGenerationCapability.RELYING_ON_EXTERNAL_API,
				supportedOwners: 'ANY_NUMBER_OF_SIGNERS',
				supportsAddingOrRemovingSigners: false,
				supportsKeyRotationWithoutModules: false,
				tokenTransferTransactionGeneration: TransactionGenerationCapability.RELYING_ON_EXTERNAL_API,
			}),
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
		chainAbstraction: {
			/** Chain bridging features. */
			bridging: {
				/** Does the wallet have a built-in bridging feature? */
				builtInBridging: supported({
					ref: {
						explanation: 'All fees are displayed when agreeing to the bridge',
						url: 'https://www.ambire.com/',
					},
					feesLargerThan1bps: {
						ref: [],
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
						walletServiceFeeDisplayUnits: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: {
					explanation:
						'Ambire supports filtering by token name and chain, as well as displaying the total balance from the resulting tokens',
					label: 'Implementation of token filtering by name',
					url: 'https://github.com/AmbireTech/extension/blob/851dc597dbe02143876ccc9f013d25cce9b20a51/src/common/modules/dashboard/components/Tokens/Tokens.tsx#L89-L106',
				},
				ether: supported({
					ref: {
						explanation: 'Ambire supports filtering by token name.',
						label: 'Implementation of token filtering by name',
						url: 'https://github.com/AmbireTech/extension/blob/851dc597dbe02143876ccc9f013d25cce9b20a51/src/common/modules/dashboard/components/Tokens/Tokens.tsx#L89-L106',
					},
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: supported({
					ref: {
						explanation: 'Ambire supports filtering by token name.',
						url: 'https://www.ambire.com/',
					},
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
			},
		},
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation: "Ambire executes generic RPC requests to get user's balance and ENS.",
					label: 'List of RPCs Ambire uses for default chains',
					url: [
						'https://github.com/AmbireTech/ambire-common/blob/22678d08810b6f28fa55886c4214d3bc54260d1f/src/consts/networks.ts',
						'https://github.com/AmbireTech/ambire-common/blob/e3a749a1cb2e4bf098b18e547b363a1931a81d29/src/services/ensDomains/ensDomains.ts',
						'https://github.com/AmbireTech/ambire-common/blob/362e2dc1e2e769d23f5de1717b66ff295c8e91bc/src/libs/portfolio/getOnchainBalances.ts',
					],
				},
				{
					explanation:
						'Ambire lets you customize the chain provider before any request is made to it.',
					label: 'Ambire tweet announcing onboarding-time chain provider configuration',
					url: ['https://x.com/ambire/status/2016861388103373134'],
				},
			],
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
		ecosystem: {
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					nonDelegationTransactionDetailsIdenticalToNormalFlow: true,
				}),
				fee: {
					crossChainGas: featureSupported,
					walletSponsored: featureSupported,
				},
			},
		},
		integration: {
			browser: {
				ref: {
					url: 'https://github.com/AmbireTech/extension/blob/104b0a29114a2133c19dcb833c7425de096fbb92/src/web/extension-services/background/background.ts',
				},
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: 'https://github.com/AmbireTech/extension/blob/82c86aa342b85ece2afbe3689a5b52be9c6e1ff9/LICENSE',
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: true,
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'Ambire integrates Sentry for anonymous crash/error reporting in the web extension context.',
							url: 'https://github.com/AmbireTech/extension/blob/5942801f127d41d25170ef079e94aa64eb606210/src/common/config/analytics/CrashAnalytics.web.ts',
						},
						{
							explanation:
								'Sentry is initialized in the background service worker, and events are only sent when crash analytics are enabled.',
							url: 'https://github.com/AmbireTech/extension/blob/104b0a29114a2133c19dcb833c7425de096fbb92/src/web/extension-services/background/background.ts',
						},
						{
							explanation:
								'Ambire provides a user toggle for enabling/disabling crash analytics in settings.',
							url: 'https://github.com/AmbireTech/extension/blob/b4e45b584754694555d433a52e8aab8f4e0ac539/src/common/modules/settings/components/General/CrashAnalyticsControlOption/CrashAnalyticsControlOption.tsx',
						},
					],
					entity: sentry,
					// Ambire enables anonymous crash reporting by default (except dev/Firefox).
					policy: CollectionPolicy.BY_DEFAULT,
				}),
				usage: notSupported,
			},
			appIsolation: {
				[Variant.BROWSER]: {
					createInAppConnectionFlow: notSupported,
					erc7846WalletConnect: notSupported,
					ethAccounts: supported({
						ref: refTodo,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupported,
				},
				[Variant.MOBILE]: null,
				[Variant.DESKTOP]: null,
			},
			dataCollection: {
				[UserFlow.INSTALL]: { collected: [] },
				[UserFlow.NATIVE_SWAP]: {
					collected: [
						{
							ref: dataLeakReferences.lifi,
							byEntity: lifi,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.ASSET_METADATA],
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.ONBOARDING_NEW]: {
					collected: [
						{
							ref: dataLeakReferences.ambire,
							byEntity: ambireEntity,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ASSETS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.BALANCE]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
						{
							ref: refTodo,
							byEntity: monad,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
						{
							ref: refTodo,
							byEntity: citrea,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
					],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_IMPORT]: {
					collected: [
						{
							ref: dataLeakReferences.ambire,
							byEntity: ambireEntity,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ASSETS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.BALANCE]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
						{
							ref: refTodo,
							byEntity: monad,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
						{
							ref: refTodo,
							byEntity: citrea,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
					],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND_ETHER]: {
					collected: [],
				},
				[UserFlow.SEND_USDC]: {
					collected: [
						{
							ref: dataLeakReferences.ambire,
							byEntity: ambireEntity,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ASSETS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.BALANCE]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [],
				},
				[UserFlow.MAKE_TRANSACTION]: {
					collected: [
						{
							ref: dataLeakReferences.ambire,
							byEntity: ambireEntity,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
							role: EntityRole.OPERATOR,
						},
						{
							ref: dataLeakReferences.pimlico,
							byEntity: pimlico,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
							role: EntityRole.OPERATOR,
						},
						{
							ref: dataLeakReferences.biconomy,
							byEntity: biconomy,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.UNCLASSIFIED]: {
					collected: [
						{
							ref: dataLeakReferences.github,
							byEntity: github,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
							},
							purposes: [
								DataCollectionPurpose.UPDATE_CHECKING,
								DataCollectionPurpose.STATIC_ASSETS,
							],
							role: EntityRole.OPERATOR,
						},
						// ENS resolution when the user opens the wallet
						{
							ref: dataLeakReferences.ambire,
							byEntity: ambireEntity,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
							role: EntityRole.OPERATOR,
						},
					],
				},
			},
			privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20(26%20November%202021).pdf',
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
				drills: notSupported,
				// Supported in v1 but not v2.
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation: 'As from August 2025, this bug bounty program is no longer active.',
						url: 'https://blog.ambire.com/ambire-x-immunefy-bug-bounty-audit-our-code-and-earn-rewards/',
					},
				],
				availability: BugBountyProgramAvailability.INACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-12-17' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			duressResistance: {
				basicUnlock: {
					ref: refTodo,
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: true,
						[BasicUnlockMechanism.BIOMETRIC]: false,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
			},
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'You can natively sign transactions with Ledger, Trezor, or GridPlus Lattice1 in Ambire.',
						url: 'https://www.ambire.com/',
					},
					{
						explanation:
							'Ambire additionally supports the Keystone and Keycard hardware wallets via QR-code signing through its "Connect QR wallet" flow. The wallet\'s QR hardware-wallet registry lists Keystone and Keycard.',
						url: 'https://github.com/AmbireTech/extension/blob/2a5bfb52fc07d6ab23a30aed001cade45dde6824/src/common/modules/hardware-wallets/qr/wallets/index.ts',
					},
					{
						file: 'public/references/wallets/ambire/screenshots/2026-07-22-ambire-qr-hardware-wallets.png',
						label: 'Ambire "Connect QR wallet" flow, showing Keystone and Keycard',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.QR],
					}),
					[HardwareWalletType.KEYCARD]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.QR],
					}),
				},
			},
			keysHandling: {
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: v2Audits,
			scamAlerts: {
				contractTransactionWarning: supported<WithRef<ContractTransactionWarning>>({
					ref: scamAlertsAndSendTxWarningRefs,
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: false,
					leaksUserIp: true,
					previousContractInteractionWarning: true,
					recentContractWarning: false,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: {
						explanation:
							"Every 6 hours, Ambire downloads a list of publicly available known scam URLs from an external API. Then, it checks if the website you're connecting to is on that list. If it is, a warning is displayed.",
						lastRetrieved: '2025-04-02',
						urls: [
							{
								label: 'Implementation',
								url: 'https://github.com/AmbireTech/ambire-common/blob/2216ea165a56b01ccb76ab2895fa1295577af10e/src/controllers/phishing/phishing.ts',
							},
						],
					},
					leaksUserAddress: false,
					leaksUserIp: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: supported<SendTransactionWarning>({
					ref: scamAlertsAndSendTxWarningRefs,
					addressPoisoningDetection: true,
					leaksRecipient: true,
					leaksUserAddress: false,
					leaksUserIp: true,
					newRecipientWarning: true,
					userWhitelist: false, // address book is no sufficient in functionality for this flag
				}),
				unlimitedApprovalWarning: notSupported,
			},
			securityBestPractices: {
				browser: {
					ref: refTodo,
					browserExtensionHardening: parseBrowserExtensionManifest(ambireRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'NOT_A_MOBILE_APP',
			},
			transactionLegibility: {
				ref: [
					{
						file: 'public/references/wallets/ambire/screenshots/2026-06-11-transaction_legibility_1.png',
						label: 'Transaction legibility screenshot 1',
					},
					{
						file: 'public/references/wallets/ambire/screenshots/2026-06-11-transaction_legibility_2.png',
						label: 'Transaction legibility screenshot 2',
					},
				],
				erc4361: notSupportedWithRef({
					ref: {
						explanation: 'Ambire formats SIWE requests for easy readability.',
						file: 'public/references/wallets/ambire/screenshots/2026-07-24-ambire-erc4361-siwe.png',
						label: 'Ambire sign-in dialog for an ERC-4361 signature request',
					},
				}),
				erc7730: supported({
					ref: refTodo,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
				}),
				erc8213: supported({
					ref: refTodo,
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ETH_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
						nondeterminism: 'STATIC_SINGLE_OUTCOME' as const,
					},
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: refTodo,
					arbitrum: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					opStack: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
				}),
				erc20L1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'The `setup:ci` script enforces lockfile sync with `yarn install --frozen-lockfile`.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/package.json',
						},
						{
							explanation: 'CI workflows execute `yarn setup:ci` before builds.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/.github/workflows/build-extensions.yml',
						},
					],
				}),
				dependencyVulnerabilityScanning: notSupported /* we have it but it is not public */,
				hasPublicChangelog: supported({
					ref: 'https://github.com/AmbireTech/extension/releases',
				}),
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The release build workflow updates git submodules during build execution, requiring network access rather than using a fully pre-fetched offline input set.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/.github/workflows/build-extensions.yml',
						},
						{
							explanation:
								'Android build workflow runs `yarn setup:ci` during build, so JavaScript dependencies are resolved/fetched at build time.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/.github/workflows/_build-android.yml',
						},
						{
							explanation:
								'iOS build workflow runs `bundle exec pod install`, which performs dependency resolution/fetching during the build job.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/.github/workflows/_build-ios.yml',
						},
						{
							explanation:
								'Gecko ARM64 release build pulls base images and installs Alpine packages (`apk add`) at runtime, indicating non-hermetic networked build inputs.',
							url: 'https://github.com/AmbireTech/extension/blob/19c22dbba374dc12730f1f40e3fce33e71ad2f90/.github/workflows/build-extension-gecko.yml',
						},
					],
				}),
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: 'https://github.com/AmbireTech/ambire-common/blob/eba5dda7bccbd1c404f293d75c4ea74d939c8d01/src/libs/account/EOA7702.ts#L181-L183',
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
