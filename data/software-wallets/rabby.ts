import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
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
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import { displaysFullTransactionDetails } from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
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
	comprehensiveFeesShownByDefault,
	FeeDisplayLevel,
} from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceAvailableNonFOSSLicense,
} from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { cure53 } from '../entities/cure53'
import { deBank } from '../entities/debank'
import { leastAuthority } from '../entities/least-authority'
import { slowMist } from '../entities/slowmist'

export const rabby: SoftwareWallet = {
	metadata: {
		id: 'rabby',
		displayName: 'Rabby',
		tableName: 'Rabby',
		blurb: paragraph(`
			Rabby is a user-friendly Ethereum wallet focusing on smooth UX and security.
			It features an intuitive transaction preview feature and works on many chains.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2024-12-15',
		urls: {
			docs: ['https://rabbykit.rabby.io/'],
			extensions: [
				'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch',
			],
			repositories: ['https://github.com/RabbyHub/Rabby'],
			socials: {
				discord: 'https://discord.com/invite/seFBCWmUre',
				x: 'https://x.com/Rabby_io',
			},
			websites: ['https://rabby.io'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: 'https://github.com/RabbyHub/Rabby/blob/fa9d0988e944f67e70da67d852cf3041d3b162da/src/background/controller/provider/controller.ts#L402-L407',
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
			safe: supported({
				ref: refTodo,
				canDeployNew: notSupported,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				supportedConfigs: {
					maxOwners: 10,
					minOwners: 1,
					moduleSupport: 'partial',
					supportsAnyThreshold: true,
				},
				supportsKeyRotationWithoutModules: true,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
		},
		addressResolution: {
			ref: [
				{
					explanation:
						'Rabby supports resolving plain ENS addresses when importing watch addresses, but not when sending funds.',
					url: 'https://github.com/RabbyHub/Rabby/blob/5f2b84491b6af881ab4ef41f7627d5e068d10652/src/ui/views/ImportWatchAddress.tsx#L170',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.NONE,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo,
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
			ref: refTodo,
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: notSupported,
					erc20TokenSend: notSupported,
					etherBalanceLookup: notSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			}),
		}),
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				ref: [
					{
						explanation:
							'Rabby implements the EIP-1193 Provider interface and injects it into web pages. EIP-2700 and EIP-6963 are also supported.',
						url: 'https://github.com/RabbyHub/Rabby/blob/develop/src/background/utils/buildinProvider.ts',
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: notSupportedWithRef({
				ref: 'https://github.com/RabbyHub/Rabby/blob/fa9d0988e944f67e70da67d852cf3041d3b162da/src/background/controller/provider/controller.ts#L402-L407',
			}),
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation: "Rabby's rabby-api package is unlicensed.",
						url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
					},
					{
						explanation:
							"Other than its rabby-api package, Rabby's core code is licensed under the MIT license.",
						url: 'https://github.com/RabbyHub/Rabby/blob/develop/LICENSE',
					},
				],
				license: SourceAvailableNonFOSSLicense.UNLICENSED_VISIBLE,
			},
			walletAppLicense: {
				[Variant.BROWSER]: {
					ref: [
						{
							explanation: "Rabby's browser extension is licensed under the MIT license.",
							url: 'https://github.com/RabbyHub/Rabby/blob/develop/LICENSE',
						},
					],
					license: FOSSLicense.MIT,
				},
				[Variant.MOBILE]: {
					ref: [
						{
							explanation: "Rabby's mobile app is unlicensed.",
							url: 'https://github.com/RabbyHub/rabby-mobile',
						},
					],
					license: SourceAvailableNonFOSSLicense.UNLICENSED_VISIBLE,
				},
				[Variant.DESKTOP]: {
					ref: [
						{
							explanation: "Rabby's desktop app is licensed under the MIT license.",
							url: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/LICENSE',
						},
					],
					license: FOSSLicense.MIT,
				},
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Rabby is owned by DeBank, which is funded by venture capital.',
					url: [
						{
							label: 'Series A',
							url: 'https://www.crunchbase.com/funding_round/debank-series-a--65945a04',
						},
						{
							label: 'Series B',
							url: 'https://www.crunchbase.com/funding_round/debank-series-b--44225a21',
						},
					],
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true, // Swap fees
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
				[Variant.BROWSER]: {
					[UserFlow.NATIVE_SWAP]: {
						collected: [],
					},
					[UserFlow.SEND]: {
						collected: [],
					},
					[UserFlow.ONBOARDING]: {
						collected: [],
						publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
					},
					[UserFlow.TRANSACTION]: {
						collected: [],
					},
					[UserFlow.APP_CONNECTION]: {
						collected: [
							{
								ref: [
									{
										explanation:
											'Rabby checks whether the domain you are connecting your wallet to is on a scam list. It sends the domain along with Ethereum address in non-proxied HTTP requests for API methods `getOriginIsScam`, `getOriginPopularityLevel`, `getRecommendChains`, and others.',
										label: 'Rabby API code on npmjs.com',
										url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
									},
								],
								// The code refers to this by `api.rabby.io`, but Rabby is wholly owned by DeBank.
								byEntity: deBank,
								dataCollection: {
									[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
									[PersonalInfo.TRACKING_IDENTIFIER]: CollectionPolicy.ALWAYS,
									[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
									[WalletInfo.WALLET_CONNECTED_DOMAINS]: CollectionPolicy.ALWAYS, // Scam prevention dialog queries online service and sends domain name
									endpoint: RegularEndpoint,
									multiAddress: {
										type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
									},
								},
								purposes: [DataCollectionPurpose.SCAM_DETECTION],
							},
						],
					},
					[UserFlow.UNCLASSIFIED]: {
						collected: [
							{
								ref: [
									{
										explanation: 'All wallet traffic goes through api.rabby.io without proxying.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/constant/index.ts#L468',
									},
									{
										explanation: 'Balance refresh requests are made about the active address only.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/background/controller/wallet.ts#L1622',
									},
									{
										explanation:
											'Rabby uses self-hosted Matomo Analytics to track user actions within the wallet interface. While this tracking data does not contain wallet addresses, it goes to DeBank-owned servers much like Ethereum RPC requests do. This puts DeBank in a position to link user actions with wallet addresses through IP address correlation.',
										url: 'https://github.com/search?q=repo%3ARabbyHub%2FRabby%20matomoRequestEvent&type=code',
									},
								],
								// The code refers to this by `api.rabby.io`, but Rabby is wholly owned by DeBank.
								byEntity: deBank,
								dataCollection: {
									[PersonalInfo.CEX_ACCOUNT]: CollectionPolicy.NEVER, // There appears to be code to link to a Coinbase account but no way to reach it from the UI?
									[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
									[PersonalInfo.TRACKING_IDENTIFIER]: CollectionPolicy.ALWAYS,
									[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
									[WalletInfo.USER_ACTIONS]: CollectionPolicy.ALWAYS, // Matomo analytics
									[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
									endpoint: RegularEndpoint,
									multiAddress: {
										type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
									},
								},
								purposes: [
									DataCollectionPurpose.CHAIN_DATA_LOOKUP,
									DataCollectionPurpose.ANALYTICS,
									DataCollectionPurpose.SWAP_QUOTE,
									DataCollectionPurpose.TRANSACTION_BROADCAST,
									DataCollectionPurpose.TRANSACTION_SIMULATION,
								],
							},
						],
					},
				},
				[Variant.DESKTOP]: null,
				[Variant.MOBILE]: null,
			},
			privacyPolicy: 'https://rabby.io/docs/privacy',
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
				guardianRecovery: notSupported,
			},
			bugBountyProgram: null,
			hardwareWalletSupport: {
				[Variant.DESKTOP]: {
					ref: [
						{
							explanation:
								'Rabby Desktop supports Ledger, Trezor, OneKey, Keystone, AirGap Vault, CoolWallet, GridPlus, and NGRAVE ZERO hardware wallets. Note that this support is only available in the desktop version, not in the mobile or browser extension versions.',
							url: 'https://rabby.io/download',
						},
					],
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.webUSB],
						}),
						[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.webUSB],
						}),
						[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.QR],
						}),
						[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.webUSB],
						}),
						[HardwareWalletType.OTHER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.webUSB],
						}),
					},
				},
				[Variant.BROWSER]: null,
				[Variant.MOBILE]: null,
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
			publicSecurityAudits: [
				{
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2021/%5B20210623%5DRabby%20chrome%20extension%20Penetration%20Testing%20Report.pdf',
					auditDate: '2021-06-18',
					auditor: slowMist,
					codeSnapshot: {
						date: '2021-06-23',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2022/%5B20220318%5DSlowMist%20Audit%20Report%20-%20Rabby%20browser%20extension%20wallet.pdf',
					auditDate: '2022-03-18',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'f6d19bd70664a7214677918e298619d583f9c3f1',
						date: '2022-01-26',
						tag: 'v0.21.1',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2023/%5B20230720%5DSlowMist%20Audit%20Report%20-%20Rabby%20Wallet.pdf',
					auditDate: '2023-07-20',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'f6221693b877b3c4eb1c7ac61146137eb1908997',
						date: '2023-06-19',
						tag: 'v0.91.0',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet%20Desktop.pdf',
					auditDate: '2023-09-26',
					auditor: slowMist,
					codeSnapshot: {
						commit: '586447a46bcd0abab6356076e369357050c97796',
						date: '2023-09-01',
						tag: 'v0.33.0-prod',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.DESKTOP]: true },
				},
				{
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/Least%20Authority%20-%20Debank%20Rabby%20Walle%20Audit%20Report.pdf',
					auditDate: '2024-10-18',
					auditor: leastAuthority,
					codeSnapshot: {
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
						date: '2024-09-08',
					},
					unpatchedFlaws: [
						{
							name: 'Issue B: Insecure Key Derivation Function',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'Issue C: Weak Encryption Method Used',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'Issue D: Weak PBKDF2 Parameters Used',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
					],
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/Cure53%20-%20Debank%20Rabby%20Wallet%20Audit%20Report.pdf',
					auditDate: '2024-10-22',
					auditor: cure53,
					codeSnapshot: {
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
						date: '2024-09-08',
					},
					unpatchedFlaws: [
						{
							name: 'RBY-01-001 WP1-WP2: Mnemonic recoverable via process dump',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-002 WP1-WP2: Password recoverable via process dump',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-012 WP1-WP2: RabbitCode secret recoverable from installer files',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-014 WP1-WP2: Backup password prompt bypassable',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'RBY-01-003 WP1-WP2: Lack of rate limiting for password unlock',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
					],
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/audits/2024/SlowMist%20Audit%20Report%20-%20Rabby%20mobile%20wallet%20iOS.pdf',
					auditDate: '2024-10-23',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'a424dbe54bba464da7585769140f6b7136c9108b',
						date: '2024-06-17',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2024/%5B20241212%5DLeast%20Authority%20-%20DeBank%20Rabby%20Wallet%20Extension%20Final%20Audit%20Report.pdf',
					auditDate: '2024-12-12',
					auditor: leastAuthority,
					codeSnapshot: {
						commit: 'eb5da18727b38a3fd693af8b74f6f151f2fd361c',
						date: '2024-10-14',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/audits/2024/%5B20241217%5DRabby%20Browser%20Extension%20Wallet%20-%20SlowMist%20Audit%20Report.pdf',
					auditDate: '2024-12-17',
					auditor: slowMist,
					codeSnapshot: {
						commit: '4e900e5944a671e99a135eea417bdfdb93072d99',
						date: '2024-11-28',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							label: 'Rabby Security engine rule for contract recency',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/permit.ts#L42-L70',
						},
						{
							label: 'Rabby Security engine rule for contracts flagged as suspicious',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/tokenApprove.ts#L73-L92',
						},
						{
							explanation:
								'Rabby checks whether the contract you are visiting is on a scam list. It sends the contract along with Ethereum address in non-proxied HTTP requests for API method `unexpectedAddrList`.',
							label: 'Rabby API code on npmjs.com',
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							label: 'Rabby Security engine rule for scam URL flagging',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/connect.ts#L5-L73',
						},
						{
							explanation:
								'Rabby checks whether the domain you are visiting is on a scam list. It sends the domain along with Ethereum address in non-proxied HTTP requests for API methods `getOriginIsScam`, `getOriginPopularityLevel`, `getRecommendChains`, and others.',
							label: 'Rabby API code on npmjs.com',
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
						},
					],
					leaksIp: true,
					leaksUserAddress: true,
					leaksVisitedUrl: 'DOMAIN_ONLY',
				}),
				sendTransactionWarning: supported({
					ref: [
						{
							label: 'Rabby Security engine rule for sending to unknown addresses',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L25-L44',
						},
						{
							label: 'Rabby Security engine rule for sending to whitelisted addresses',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L113-L132',
						},
					],
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					userWhitelist: true,
				}),
			},
			transactionLegibility: {
				ref: refTodo,
				calldataDisplay: null,
				messageSigningLegibility: null,
				transactionDetailsDisplay: displaysFullTransactionDetails,
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
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				erc20L1Transfer: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				ethL1Transfer: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				uniswapUSDCToEtherSwap: supported(comprehensiveFeesShownByDefault),
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: true,
	},
}
