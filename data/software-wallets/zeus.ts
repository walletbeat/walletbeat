import { greekfetacheese } from '@/data/contributors/greekfetacheese'
import { across } from '@/data/entities/across'
import { github } from '@/data/entities/github'
import { pimlico } from '@/data/entities/pimlico'
import { userEnabledRpcEndpoints } from '@/data/entities/user-enabled-rpc'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
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
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	DataDisplayOptions,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
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
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

export const zeus: SoftwareWallet = {
	metadata: {
		id: 'zeus',
		displayName: 'Zeus',
		tableName: 'Zeus',
		blurb: paragraph(`
			Zeus is a truly seedless and decentralized self-custodial Ethereum wallet.
		`),
		contributors: [greekfetacheese],
		iconExtension: 'svg',
		lastUpdated: '2026-08-02',
		urls: {
			docs: ['https://github.com/greekfetacheese/zeus'],
			repositories: ['https://github.com/greekfetacheese/zeus'],
			websites: ['https://github.com/greekfetacheese/zeus'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: [
					{
						explanation:
							'Zeus derives a Hierarchical Deterministic Wallet from a username and password using the BIP32 standard. Users can also import wallets using either a 12-24 word phrase or a private key.',
						url: 'https://github.com/greekfetacheese/zeus#how-wallet-management-work-in-zeus',
					},
				],
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: false,
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
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: [
						{
							explanation:
								'Zeus has a built-in Across bridge UI. By default it shows an amber risk warning that bridge functionality is powered by Across Protocol, an independent provider, and that the user should understand the risks. Before the user can bridge, the same screen itemizes fees as Network, Bridge, and Total amounts.',
							file: 'public/references/wallets/zeus/screenshots/2026-08-12-chain-abstraction-bridge-ui.png',
							label:
								'Zeus desktop Bridge UI showing the Across Protocol risk warning by default and Network / Bridge / Total fee breakdown',
							lastRetrieved: '2026-08-12',
						},
						{
							explanation:
								'Zeus implements the built-in Across bridge UI in across.rs (risk banner and Network / Bridge / Total fee lines).',
							url: 'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/across.rs',
						},
					],
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
						walletServiceFeeDisplayUnits: null,
					},
					risksExplained: 'VISIBLE_BY_DEFAULT',
				}),
				suggestedBridging: notSupported,
			},
			// (@greekfetacheese) Zeus does show the total value of a wallet that can detect across chains but it does not break it down
			// chain by chain.
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
			ref: [
				{
					explanation:
						'Zeus ships with a list of default public RPC endpoints, but they are disabled by default so no RPC requests are made until the user enables a default endpoint or adds their own. Users can enable, disable, or remove defaults and use custom RPCs. The UI warns when a chain has no enabled or working RPC and links to Network Settings.',
					url: [
						'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/core/context/client.rs',
						'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/gui/ui/panels/top_panel.rs',
						'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/gui/ui/settings/networks.rs',
					] as NonEmptyArray<string>,
				},
			],
			customChainRpcEndpoint: supported({
				ref: [
					{
						explanation:
							'Users can add their own RPC endpoints, enable or disable defaults, and remove default RPCs they do not want.',
						url: 'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/gui/ui/settings/networks.rs',
					},
				],
			}),
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
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Zeus is licensed under the MIT license.',
						url: 'https://github.com/greekfetacheese/zeus/blob/e2f12ad22ae24845f8f9bee1f0187be0a5bd07c8/LICENSE-MIT',
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
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
				// No telemetry / crash reporting endpoints in Zeus.
				crashReports: notSupported,
				usage: notSupported,
			},
			appIsolation: {
				[Variant.DESKTOP]: {
					createInAppConnectionFlow: notSupported,
					erc7846WalletConnect: notSupported,
					ethAccounts: supported({
						ref: [
							{
								explanation: 'Zeus exposes the address of the active account only.',
								url: 'https://github.com/greekfetacheese/zeus/blob/8d51c76d1c6ccce5a4a845c34429a4f89ff9cdae/src/server.rs#L371',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupported,
				},
			},
			// External traffic is limited to user-enabled RPCs, optional bridge/bundler
			// APIs, and optional circuit artifact downloads for Railgun.
			dataCollection: {
				[UserFlow.INSTALL]: {
					// Desktop portable binary.
					collected: [],
				},
				[UserFlow.ONBOARDING_NEW]: {
					// Local username/password HD derivation, no account signup service.
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_IMPORT]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND_ETHER]: {
					// Sends use whatever RPC endpoints the user enabled (see UNCLASSIFIED).
					collected: [],
				},
				[UserFlow.SEND_USDC]: {
					collected: [],
				},
				[UserFlow.NATIVE_SWAP]: {
					// Uniswap routing/simulation is local (revm), chain I/O is via user RPCs.
					collected: [],
				},
				[UserFlow.MAKE_TRANSACTION]: {
					collected: [
						{
							ref: [
								{
									explanation:
										'Built-in Across bridge quotes fees from the Across suggested-fees API. Default URL is https://app.across.to/api/suggested-fees with use_api enabled by default, the user can change the API URL or disable the API in Across settings. The bridge deposit itself is submitted via the user-configured RPC.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/across.rs',
									] as NonEmptyArray<string>,
								},
							],
							byEntity: across,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								// Quote requests include chain/token/amount/recipient parameters needed for suggested fees.
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.SWAP_QUOTE],
							role: EntityRole.OPERATOR,
						},
						{
							ref: [
								{
									explanation:
										'Railgun unshield defaults to a private broadcast path via the public Pimlico bundler URL (https://public.pimlico.io/v2/{chainId}/rpc). The user can point the bundler URL at a self-hosted Alto or use emergency self-broadcast.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/railgun/unshield.rs',
										'https://github.com/greekfetacheese/zeus/blob/f21eb57f0af16eb43909ed8fa2941d82cc44d304/src/gui/ui/dapps/railgun/shield.rs',
									] as NonEmptyArray<string>,
								},
							],
							byEntity: pimlico,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
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
				[UserFlow.APP_CONNECTION]: {
					// Wallet-connector talks to the local Zeus process.
					collected: [],
				},
				[UserFlow.UNCLASSIFIED]: {
					collected: [
						{
							ref: [
								{
									explanation:
										'Zeus ships default external public RPC endpoints disabled by default and lets the user add custom RPC URLs, no chain traffic happens until at least one endpoint is enabled. Once an endpoint is enabled (required for normal chain use), that operator learns IP and usual RPC contents. Critically for multi-address privacy: background ETH balance refresh loads all configured wallet addresses and batches them in a single StateView getETHBalance call (via batch::get_eth_balances), so one request can contain many addresses at once. ERC-20 balance refresh is per-owner, but the ETH multi-wallet batch is enough to correlate addresses. The default host list can change between releases, this row covers any user-enabled default or custom RPC rather than naming individual providers. Users who only ever talk to their own node avoid external-provider correlation.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/core/context/client.rs',
										'https://github.com/greekfetacheese/zeus/blob/f6c258691b47fed5f47f0a47483a8bcf827f6464/src/gui/ui/settings/networks.rs',
										'https://github.com/greekfetacheese/zeus/blob/dcf01cc56dae5b12ba3469fc36c935f5fa5348b4/src/core/context/balance_manager.rs',
										'https://github.com/greekfetacheese/zeus/blob/dcf01cc56dae5b12ba3469fc36c935f5fa5348b4/crates/zeus-eth/src/utils/batch.rs',
									] as NonEmptyArray<string>,
								},
							],
							byEntity: userEnabledRpcEndpoints,
							dataCollection: {
								// Defaults ship disabled (user must enable an endpoint first). Policy is
								// BY_DEFAULT for the enabled-RPC operating mode: once any endpoint is on,
								// chain/balance/broadcast traffic happens automatically without a separate
								// privacy opt-in. Multi-address scorer only considers rows where
								// ACCOUNT_ADDRESS is collected by default, OPT_IN would incorrectly hide
								// the StateView multi-wallet ETH batch and yield a false PASS.
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.BALANCE]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ASSETS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
								},
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
								DataCollectionPurpose.GAS_QUOTE,
								DataCollectionPurpose.TOKEN_PRICE_LOOKUP,
							],
							role: EntityRole.OPERATOR,
						},
						{
							ref: [
								{
									explanation:
										'Missing Railgun proving-circuit artifacts beyond the embedded hot-set are downloaded from the privacy-protocol-artifacts GitHub raw host during optional prefetch/use. Some common circuits are embedded in the binary and need no download.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/dcf01cc56dae5b12ba3469fc36c935f5fa5348b4/crates/zeus-railgun/src/circuit/remote_artifact_loader.rs',
										'https://github.com/greekfetacheese/zeus/blob/dcf01cc56dae5b12ba3469fc36c935f5fa5348b4/src/utils/state.rs',
									] as NonEmptyArray<string>,
								},
							],
							byEntity: github,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.STATIC_ASSETS],
							role: EntityRole.OPERATOR,
						},
					],
				},
			},
			// No published privacy policy page for the wallet itself.
			privacyPolicy: null,
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: supported({
					ref: [
						{
							explanation:
								'Zeus has a fully native Railgun integration: local proving, local note decryption/merkle handling, and UTXO sync over the user-enabled RPC (RpcSyncer). A Subsquid syncer exists in the codebase but is not used by default and cannot be enabled from the UI. Users can shield ERC-20s, unshield ERC-20s, send private transfers to 0zk addresses, and merge notes. Unshield defaults to a privacy paymaster / bundler path (public Pimlico URL by default, user-customizable); optional self-broadcast is available for emergency withdrawals and is labeled as breaking anonymity. Private transfers and note merges are submitted from the user wallet.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/f21eb57f0af16eb43909ed8fa2941d82cc44d304/readme.md',
								'https://github.com/greekfetacheese/zeus/blob/f21eb57f0af16eb43909ed8fa2941d82cc44d304/src/gui/ui/dapps/railgun/shield.rs',
								'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/railgun/unshield.rs',
								'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/railgun/transfer.rs',
								'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/tx/events.rs',
							] as NonEmptyArray<string>,
						},
					],
					broadcasterBasedTransactionSubmission: supported({
						broadcasterFee: {
							afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
							// Confirmation UI shows separate Protocol fee and Broadcaster fee line items (token + USD).
							byDefault: FeeDisplayLevel.COMPREHENSIVE,
							fullySponsored: false,
							walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
						},
						// Default bundler is HTTPS public.pimlico.io
						broadcasterLearnsUserIpAddress: true,
						customizableBroadcaster: featureSupported,
					}),
					crossContractCalls: notSupported,
					// Unshield defaults to private broadcast (paymaster/bundler), self-broadcast is opt-in.
					defaultTransactionSubmissionType: 'BROADCASTER',
					merkleTreeSync: 'ON_USER_DEVICE',
					privateTransfers: featureSupported,
					selfRelayedTransactionSubmission: featureSupported,
					warnAboutShieldingCorrelation: notSupported,
					warnAboutSuccessiveOperations: notSupported,
					warnAboutUnshieldingDestinationCorrelation: notSupported,
					warnAboutViewingKeySharing: notSupported,
				}),
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: supported({
				ref: [
					{
						explanation:
							'Zeus uses a username and password to derive the master HD wallet. Recovery is only possible by using the same username and password.',
						url: 'https://github.com/greekfetacheese/zeus#how-wallet-management-work-in-zeus',
					},
				],
				drills: null,
				guardianRecovery: notSupported,
			}),
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: {
				ref: [
					{
						explanation:
							'Keys are generated fully on the user device using BIP32 derivation from a seed derived via Argon2Id from username and password.',
						url: 'https://github.com/greekfetacheese/zeus#how-the-wallet-recovery-works',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: notSupportedWithRef({
					ref: [
						{
							explanation:
								'Zeus currently does not have a scam alert mechanism, It simply shows with which contract you are interacting with. If it is a known contract a hyperlink with the contracts name is shown otherwise a truncated version of the contract address is shown (hyperlink). The user can also see all the decoded events to inspect the transaction.',
							label: 'Contract interaction is shown in the transaction details',
							url: 'https://github.com/greekfetacheese/zeus/blob/6fc3006fd8790f3f0db2feae24a5bdbad07c0c30/src/gui/ui/tx_window.rs#L246C1-L247C1',
						},
					],
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					ref: [
						{
							label: 'Before every transaction the user must confirm the action.',
							url: 'https://github.com/greekfetacheese/zeus/blob/6fc3006fd8790f3f0db2feae24a5bdbad07c0c30/src/utils/tx.rs#L241C1-L242C1',
						},
					],
					addressPoisoningDetection: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					userWhitelist: true,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: supported({
				ref: [
					{
						explanation:
							'Zeus performs local EVM simulations to verify and display exact transaction outcomes, including decoding of common events like ERC-20 transfers, swaps, approvals etc.',
						url: 'https://github.com/greekfetacheese/zeus/blob/6fc3006fd8790f3f0db2feae24a5bdbad07c0c30/src/core/tx_analysis.rs',
					},
				],
				erc4361: null,
				erc7730: null,
				erc8213: supported({
					ref: refTodo,
					calldataDisplay: null,
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.NOT_IN_UI,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: null,
			}),
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: [
						{
							explanation: 'Zeus submits transactions via RPC endpoints.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: supported({
						ref: [
							{
								explanation: 'Users can provide their own RPC endpoint to a self-hosted node.',
								url: 'https://github.com/greekfetacheese/zeus#features',
							},
						],
					}),
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					ref: [
						{
							explanation: 'Zeus submits L2 transactions via RPC endpoints.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show exact outcomes including fees.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: null,
				}),
				erc20L1Transfer: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show the exact tokens the recipient will receive in case of a token tax but it does not breakdown the fees if any.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show exact outcomes including fees.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show exact outcomes but it does not show the fees if any.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.DESKTOP]: true,
	},
}
