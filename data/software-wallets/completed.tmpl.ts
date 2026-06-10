/**
 * completed.tmpl.ts, Reference template where every rated attribute scores PASS.
 *
 * This is a fictitious wallet that demonstrates the exact feature values required
 * for every walletbeat attribute to receive a PASS rating.
 *
 * Use this as a reference when filling in real wallet data to understand what
 * "best-in-class" looks like for each field.
 *
 * NOTE: Most `ref` fields use `refTodo` as a placeholder. `MustRef` fields (e.g.
 * enclave audit refs, orderflow practices page) use example URLs instead. Real
 * wallet submissions must replace placeholders with URLs pointing to the source
 * of each claim (source code, documentation, or audit report).
 */

import { exampleContributor } from '@/data/contributors/example'
import {
	exampleCex,
	exampleNodeCompany,
	exampleOrderflowAuctioneer,
	exampleSecurityAuditor,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	type Endpoint,
	MultiAddressPolicy,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import {
	PrivateTransferTechnology,
	StealthAddressUnlabeledBehavior,
} from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { GuardianPolicyType, GuardianType } from '@/schema/features/security/account-recovery'
import { BasicUnlockMechanism, DuressAction } from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { EthereumL1LightClient } from '@/schema/features/security/light-client'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type {
	ContractTransactionWarning,
	ScamUrlWarning,
	SendTransactionWarning,
} from '@/schema/features/security/scam-alerts'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import {
	HostPermissionScope,
	KeyStorageMechanism,
	SecureRngSource,
	WebAccessibleResourcesScope,
} from '@/schema/features/security/security-best-practices'
import {
	BasicBenchmarkTransactions,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	displaysFullCallData,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { SpendingApprovalsControl } from '@/schema/features/self-sovereignty/permissions-management'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	comprehensiveFeesShownByDefault,
	fullySponsoredFees,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import {
	OnchainVerificationDocumentation,
	OrderflowDisclosureLevel,
} from '@/schema/features/transparency/orderflow'
import type { ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { type References, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

/**
 * Fictitious data leak references for the completed template.
 * These are placeholders — replace with real URLs when filling in actual wallet data.
 */
const dataLeakReferences: Record<string, References> = {
	bundler: [
		{
			explanation: 'Used as a bundler for ERC-4337 user operations.',
			url: 'https://example.com/bundler',
		},
	],
	orderflowAuctioneer: [
		{
			explanation: 'Receives mempool transactions for orderflow auctioning by default.',
			url: 'https://example.com/orderflow-auctioneer',
		},
	],
	staticContent: [
		{
			explanation: 'Used for static content and asset delivery.',
			url: 'https://example.com/cdn',
		},
	],
	swapApi: [
		{
			explanation: 'Used as a bridge and swap API.',
			url: 'https://example.com/swap',
		},
	],
	walletBackend: [
		{
			explanation: 'RPC traffic for default chains passes through the wallet developer backend.',
			url: 'https://example.com/rpc',
		},
	],
}

/**
 * A sealed secure enclave endpoint.
 *
 * Using this as the endpoint for a data collection entry that includes
 * ACCOUNT_ADDRESS allows address-correlation to PASS, because:
 * - The enclave does not log data externally.
 * - End-to-end encryption is terminated inside the enclave.
 * - The enclave software is open-source, reproducibly built, and
 *   client-verified.
 * This means `endpointLearnsUserIpAddress()` returns 'NO', so IP_ADDRESS
 * is not inferred as collected even though an HTTP request is made.
 * Without a sealed enclave, any RegularEndpoint collecting ACCOUNT_ADDRESS
 * will also infer IP_ADDRESS = BY_DEFAULT, causing address-correlation PARTIAL.
 */
const sealedEnclaveEndpoint: Endpoint = {
	type: 'SECURE_ENCLAVE',
	endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
	externalLogging: { type: 'NO' },
	verifiability: {
		ref: refTodo,
		clientVerification: {
			type: 'VERIFIED',
			ref: 'https://example.com',
			verificationCodeAudit: { ref: 'https://example.com' },
		},
		independentCodeAudit: { ref: 'https://example.com' },
		reproducibleBuilds: true,
		sourceAvailable: true,
	},
}

/**
 * Recent security audit with no unpatched flaws.
 *
 * PASS for security-audits requires:
 * - auditDate within the last 366 days (today = 2026-02-27, so >= 2025-02-27)
 * - unpatchedFlaws = 'NONE_FOUND' or 'ALL_FIXED'
 */
const recentAudit: SecurityAudit = {
	ref: 'https://example.com', // Replace with URL to the public audit report
	auditDate: '2025-12-15',
	auditor: exampleSecurityAuditor,
	codeSnapshot: {
		date: '2025-12-01',
	},
	unpatchedFlaws: 'NONE_FOUND',
	variantsScope: { [Variant.BROWSER]: true, [Variant.MOBILE]: true },
}

export const completedTemplate: SoftwareWallet = {
	metadata: {
		id: 'completed',
		displayName: 'Completed wallet template',
		tableName: 'Completed',
		blurb: paragraph(`
			This is a fictitious wallet with all of its rated fields set to PASS values.
			It is meant to serve as a reference for contributors to understand what
			best-in-class implementation looks like for each walletbeat attribute.
		`),
		contributors: [exampleContributor],
		iconExtension: 'svg',
		lastUpdated: '2026-02-27',
		urls: {
			docs: ['https://example.com/docs'],
			extensions: ['https://chromewebstore.google.com/detail/walletbeat/fake-extension'],
			repositories: ['https://example.com/repo'],
			socials: {
				x: 'https://x.com/example',
			},
			websites: ['https://example.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
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
				ref: refTodo,
				contract: {
					name: 'Example Smart Wallet Contract',
					address: '0x0000000000000000000000000000000000000001',
					eip7702Delegatable: false,
					methods: {
						isValidSignature: featureSupported,
						validateUserOp: featureSupported,
					},
					sourceCode: {
						ref: refTodo,
						available: true,
					},
				},
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
				erc7828: supported<AddressResolutionData>({
					medium: 'CHAIN_CLIENT',
				}),
				erc7831: supported<AddressResolutionData>({
					medium: 'CHAIN_CLIENT',
				}),
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: comprehensiveFeesShownByDefault,
					risksExplained: 'VISIBLE_BY_DEFAULT',
				}),
				suggestedBridging: supported({
					ref: refTodo,
				}),
			},
			crossChainBalances: {
				ref: refTodo,
				ether: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
			},
		},
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
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
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: supported({
				ref: refTodo,
				atomicMultiTransactions: featureSupported,
			}),
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: 'https://example.com',
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: true,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: false,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: notSupported,
				usage: notSupported,
			},
			appIsolation: {
				createInAppConnectionFlow: supported({
					ref: refTodo,
				}),
				erc7846WalletConnect: notSupported,
				ethAccounts: supported({
					ref: refTodo,
					defaultBehavior: ExposedAccountsBehavior.APP_SPECIFIC_ACCOUNT,
				}),
				useAppSpecificLastConnectedAddresses: supported({
					ref: refTodo,
				}),
			},
			dataCollection: {
				[UserFlow.INSTALL]: {
					collected: [],
				},
				[UserFlow.ONBOARDING_IMPORT]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_NEW]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND_ETHER]: {
					collected: [],
				},
				[UserFlow.SEND_USDC]: {
					collected: [],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [],
				},
				[UserFlow.MAKE_TRANSACTION]: {
					collected: [
						{
							ref: dataLeakReferences.orderflowAuctioneer,
							byEntity: exampleOrderflowAuctioneer,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.ORDERFLOW_AUCTION],
						},
						{
							ref: dataLeakReferences.walletBackend,
							byEntity: exampleWalletDevelopmentCompany,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.NEVER,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: sealedEnclaveEndpoint,
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
							ref: dataLeakReferences.bundler,
							byEntity: exampleNodeCompany,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.NEVER,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.NEVER,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
						},
					],
				},
				[UserFlow.NATIVE_SWAP]: {
					collected: [
						{
							ref: dataLeakReferences.swapApi,
							byEntity: exampleCex,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.ASSET_METADATA],
						},
					],
				},
				[UserFlow.UNCLASSIFIED]: {
					collected: [
						{
							ref: dataLeakReferences.staticContent,
							byEntity: exampleNodeCompany,
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
			privacyPolicy: 'https://example.com/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: PrivateTransferTechnology.STEALTH_ADDRESSES,
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: supported({
					ref: refTodo,
					balanceLookup: {
						type: 'EXTERNAL_SERVICE',
						ref: refTodo,
						externalService: exampleNodeCompany,
						learns: {
							generatedStealthAddresses: false,
							userMetaAddress: false,
						},
					},
					fees: fullySponsoredFees,
					privateKeyDerivation: {
						type: 'LOCALLY',
						ref: refTodo,
					},
					recipientAddressResolution: {
						type: 'EXTERNAL_RESOLVER',
						ref: refTodo,
						externalResolver: exampleNodeCompany,
						learns: {
							recipientGeneratedStealthAddress: false,
							recipientMetaAddress: false,
							senderIpAddress: false,
							senderMetaAddress: false,
						},
					},
					userLabeling: supported({
						ref: refTodo,
						unlabeledBehavior: StealthAddressUnlabeledBehavior.TREAT_EACH_UNLABELED_AS_OWN_BUCKET,
					}),
				}),
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				guardianRecovery: supported({
					ref: refTodo,
					minimumGuardianPolicy: {
						type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
						descriptionMarkdown:
							'The recovery secret is split across three guardians. Any two of them can help recover the account.',
						optionalGuardians: [
							{
								type: GuardianType.WALLET_PROVIDER,
								description: 'Wallet developer cloud backup service',
								entity: exampleWalletDevelopmentCompany,
							},
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Google account',
								entity: exampleCex,
							},
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Apple account',
								entity: exampleSecurityAuditor,
							},
						],
						optionalGuardiansMinimumConfigurable: 3,
						optionalGuardiansMinimumNeededForRecovery: 2,
						requiredGuardians: [],
						secretReconstitution: 'CLIENT_SIDE',
					},
				}),
			},
			bugBountyProgram: null,
			duressResistance: {
				basicUnlock: {
					ref: refTodo,
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: true,
						[BasicUnlockMechanism.BIOMETRIC]: true,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: supported({
					ref: refTodo,
					actions: {
						[DuressAction.DECOY_WALLET]: true,
						[DuressAction.ONCHAIN_LOCKDOWN]: true,
						[DuressAction.SELF_DESTRUCT]: false,
						[DuressAction.WIPE_AND_FORWARD]: false,
					},
				}),
			},
			hardwareWalletSupport: {
				ref: {
					explanation:
						'This wallet supports native transaction signing with Ledger, Trezor, and GridPlus Lattice1.',
					url: 'https://example.com/hardware-wallet-support',
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
				ethereumL1: supported({
					ref: refTodo,
					[EthereumL1LightClient.helios]: featureSupported,
				}),
			},
			passkeyVerification: supported({
				ref: refTodo,
				library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
			}),
			publicSecurityAudits: [recentAudit],
			scamAlerts: {
				contractTransactionWarning: supported<ContractTransactionWarning>({
					ref: refTodo,
					contractRegistry: true,
					leaksContractAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					previousContractInteractionWarning: true,
					recentContractWarning: true,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: refTodo,
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: supported<SendTransactionWarning>({
					ref: refTodo,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
			},
			securityBestPractices: {
				browser: {
					ref: refTodo,
					browserExtensionHardening: {
						contentScripts: HostPermissionScope.NONE,
						externallyConnectable: 'NOT_EXTERNALLY_CONNECTABLE',
						hostPermissions: HostPermissionScope.NONE,
						permissions: [],
						webAccessibleResources: WebAccessibleResourcesScope.NONE,
					},
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'NOT_A_MOBILE_APP',
			},
			transactionLegibility: {
				ref: refTodo,
				erc7730: supported({
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
					calldataDisplay: displaysFullCallData,
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_BY_DEFAULT,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							transactionOutcome: TransactionOutcome.EXPLAINED,
						},
					[BasicBenchmarkTransactions.ETH_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
						nondeterminism: 'RESIMULATES_WITH_WARNING' as const,
					},
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: supported({
				ref: refTodo,
				erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
			}),
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS,
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
			orderflowPractices: {
				ref: refTodo,
				disclosure: {
					ref: refTodo,
					afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
					byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
				},
				practicesPage: supported({
					ref: 'https://example.com/orderflow-practices',
					contents: {
						ref: refTodo,
						documentsHowToChangeDefaults: true,
						explainsDefaultOrderflowAuctioning: true,
						listsEntitiesAndWhatTheyDo: true,
						onchainVerification: OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE,
						pageLastUpdated: '2026-02-27' as CalendarDate,
					},
					url: 'https://example.com/orderflow-practices',
				}),
				userCanRemoveAuctioning: supported({ ref: refTodo }),
			},
			releaseTransparency: {
				artifactSigning: supported<ArtifactSigningDetails>({
					ref: refTodo,
					publication: 'SIGSTORE_REKOR',
					signer: 'BOTH',
				}),
				dependencyLocking: supported({ ref: refTodo }),
				dependencyVulnerabilityScanning: supported({ ref: refTodo }),
				hasPublicChangelog: supported({ ref: 'https://example.com/changelog' }),
				hermeticBuilds: supported({ ref: refTodo }),
				repositoryChangeControls: {
					ref: refTodo,
					branchDeletionBlocked: true,
					forcePushBlocked: true,
					requiredChecks: true,
					requiredReview: true,
					tagsImmutable: true,
				},
				reproducibleBuilds: supported({ ref: refTodo }),
			},
		},
	},
	variants: {
		[Variant.BROWSER]: true,
		[Variant.MOBILE]: true,
	},
}
