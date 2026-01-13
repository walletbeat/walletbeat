import { mattmatt } from '@/data/contributors/0xmattmatt'
import { jiojosbg } from '@/data/contributors/jiojosbg'
import { nconsigny } from '@/data/contributors/nconsigny'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import {
	CollectionPolicy,
	DataCollectionPurpose,
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
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { DataDisplayOptions } from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { comprehensiveFeesShownByDefault } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { type References, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

import { ambireEntity } from '../entities/ambire'
import { biconomy } from '../entities/biconomy'
import { github } from '../entities/github'
import { hunterSecurity } from '../entities/hunter-security'
import { lifi } from '../entities/lifi'
import { pashov } from '../entities/pashov-audit-group'
import { pimlico } from '../entities/pimlico'
import { ambireAccountContract } from '../wallet-contracts/ambire-account'
import { ambireDelegatorContract } from '../wallet-contracts/ambire-delegator'

const v2Audits: SecurityAudit[] = [
	{
		ref: 'https://github.com/AmbireTech/ambire-common/blob/main/audits/Pashov-Ambire-third-security-review.md',
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
		ref: 'https://github.com/AmbireTech/ambire-common/blob/main/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
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

export const ambire: SoftwareWallet = {
	metadata: {
		id: 'ambire',
		displayName: 'Ambire',
		tableName: 'Ambire',
		blurb: paragraph(`
			The first hybrid Account abstraction wallet to support Basic (EOA) and Smart accounts, 
			improving security and user experience.
			`),
		contributors: [jiojosbg, nconsigny, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-03-20',
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
					url: 'https://github.com/AmbireTech/ambire-common/blob/main/contracts/AmbireAccount.sol',
				},
				contract: ambireAccountContract,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
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
		chainAbstraction: {
			/** Chain bridging features. */
			bridging: {
				/** Does the wallet have a built-in bridging feature? */
				builtInBridging: supported({
					ref: {
						explanation: 'All fees are displayed when agreeing to the bridge',
						url: 'https://www.ambire.com/',
					},
					feesLargerThan1bps: comprehensiveFeesShownByDefault,
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: {
					explanation:
						'Ambire supports filtering by token name and chain, as well as displaying the total balance from the resulting tokens',
					label: 'Implementation of token filtering by name',
					url: 'https://github.com/AmbireTech/extension/blob/main/src/common/modules/dashboard/components/Tokens/Tokens.tsx#L89-L106',
				},
				ether: supported({
					ref: {
						explanation: 'Ambire supports filtering by token name.',
						label: 'Implementation of token filtering by name',
						url: 'https://github.com/AmbireTech/extension/blob/main/src/common/modules/dashboard/components/Tokens/Tokens.tsx#L89-L106',
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
			ref: {
				explanation: "Ambire executes generic RPC requests to get user's balance and ENS.",
				label: 'List of RPCs Ambire uses for default chains',
				url: [
					'https://github.com/AmbireTech/ambire-common/blob/main/src/consts/networks.ts',
					'https://github.com/AmbireTech/ambire-common/blob/main/src/services/ensDomains/ensDomains.ts',
					'https://github.com/AmbireTech/ambire-common/blob/main/src/libs/portfolio/getOnchainBalances.ts',
				],
			},
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: featureSupported,
					erc20TokenSend: featureSupported,
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
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
					url: 'https://github.com/AmbireTech/extension/blob/main/src/web/extension-services/background/background.ts',
				},
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: supported({
				ref: 'https://github.com/AmbireTech/ambire-common/blob/eba5dda7bccbd1c404f293d75c4ea74d939c8d01/src/libs/account/EOA7702.ts#L181-L183',
				atomicMultiTransactions: featureSupported,
			}),
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: 'https://github.com/AmbireTech/extension/blob/main/LICENSE',
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
						},
					],
				},
				[UserFlow.ONBOARDING]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND]: {
					collected: [],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [],
				},
				[UserFlow.TRANSACTION]: {
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
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
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
				dateStarted: '2021-12-17' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			hardwareWalletSupport: {
				ref: {
					explanation:
						'You can natively sign transactions with Ledger, Trezor, or GridPlus Lattice1 in Ambire.',
					url: 'https://www.ambire.com/',
				},
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
					[HardwareWalletType.KEYSTONE]: notSupported,
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
				contractTransactionWarning: notSupported,
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: {
						explanation:
							"Every 6 hours, Ambire downloads a list of publicly available known scam URLs from an external API. Then, it checks if the website you're connecting to is on that list. If it is, a warning is displayed.",
						lastRetrieved: '2025-04-02',
						urls: [
							{
								label: 'Implementation',
								url: 'https://github.com/AmbireTech/ambire-common/blob/main/src/controllers/phishing/phishing.ts',
							},
						],
					},
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: notSupported,
			},
			transactionLegibility: {
				ref: refTodo,
				calldataDisplay: null,
				messageSigningLegibility: null,
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
			},
		},
		selfSovereignty: {
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
				builtInErc20Swap: supported(comprehensiveFeesShownByDefault),
				erc20L1Transfer: supported(comprehensiveFeesShownByDefault),
				ethL1Transfer: supported(comprehensiveFeesShownByDefault),
				uniswapUSDCToEtherSwap: supported(comprehensiveFeesShownByDefault),
			},
		},
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
