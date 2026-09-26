import { greekfetacheese } from '@/data/contributors/greekfetacheese'
import { across } from '@/data/entities/across'
import { github } from '@/data/entities/github'
import { pimlico } from '@/data/entities/pimlico'
import { userEnabledRpcEndpoints } from '@/data/entities/user-enabled-rpc'
import type { SoftwareWallet } from '@/data/software-wallets'
import { ethInfinitismSimple7702Contract } from '@/data/wallet-contracts/eth-infinitism-simple-7702'
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
import {
	BuiltInSwapDefaultApprovalBehavior,
	SpendingApprovalsControl,
} from '@/schema/features/self-sovereignty/permissions-management'
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
import { OrderflowDisclosureLevel } from '@/schema/features/transparency/orderflow'
import type { ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { refNotNecessary, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { NonEmptyArray } from '@/types/utils/non-empty'

export const zeus: SoftwareWallet = {
	metadata: {
		id: 'zeus',
		displayName: 'Zeus',
		tableName: 'Zeus',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [greekfetacheese],
		iconExtension: 'svg',
		lastUpdated: '2026-09-26',
		urls: {
			docs: ['https://github.com/greekfetacheese/zeus'],
			repositories: ['https://github.com/greekfetacheese/zeus'],
			websites: ['https://github.com/greekfetacheese/zeus'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				ref: [
					{
						explanation:
							'Zeus signs EIP-7702 authorizations itself: the header exposes a delegate action that delegates the current account to any address that has contract code, and delegating to the zero address removes the delegation. Delegated accounts are tracked per chain and shown as delegated in the UI. Zeus also delegates on its own when an app requests an atomic batch, using the eth-infinitism `Simple7702Account` implementation as the target for `wallet_sendCalls` and for Railgun unshield operations.',
						url: [
							'https://github.com/greekfetacheese/zeus/blob/139be03ddeac6c64dd3e3c46fa0aa14bf293f7f0/src/core/tx/send.rs',
							'https://github.com/greekfetacheese/zeus/blob/2074e6f655ab273af998b22e6680178b79185139/src/gui/ui/header.rs',
							'https://github.com/greekfetacheese/zeus/blob/d903ab798ac49ae08dbad00c3a8d644432dfd178/src/core/tx/send_calls.rs',
							'https://github.com/greekfetacheese/zeus/blob/2e6d51404a35080fd1ebe21b82cfd5ec3b21a300/crates/zeus-userop-kit/src/smart_account/simple_smart_account.rs',
							'https://github.com/greekfetacheese/zeus/blob/3b96783f611f576c26bbc99d65ceecf506be7fa6/crates/zeus-eth/src/utils/address_book.rs',
						] as NonEmptyArray<string>,
					},
					{
						explanation:
							'Zeus confirmation window for a wallet delegation request from the Walletbeat test app, showing the delegation to `Simple7702Account` together with the batched calls balance and approval changes.',
						file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-wallet-delegation-confirmation.png',
						label:
							'Zeus confirmation window for a wallet delegation request, showing the delegation to a 7702 implementation contract with the resulting balance and approval changes',
					},
				],
				contract: ethInfinitismSimple7702Contract,
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							'Zeus derives a Hierarchical Deterministic Wallet from a username and password using the BIP32 standard. Users can also import wallets using either a 12–24 word phrase or a private key.',
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
			ref: [
				{
					explanation:
						'Zeus does not resolve human-readable addresses. The send screen accepts a raw address (or a 0zk address for private transfers) and performs no ENS, ERC-7828, or ERC-7831 lookup.',
					url: 'https://github.com/greekfetacheese/zeus/blob/139be03ddeac6c64dd3e3c46fa0aa14bf293f7f0/src/gui/ui/send_crypto.rs',
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
					ref: [
						{
							explanation:
								'Zeus has a built-in Across bridge UI. By default it shows an amber risk warning that bridge functionality is powered by Across Protocol, an independent provider, and that the user should understand the risks. Before the user can bridge, the same screen itemizes fees as Network, Bridge, and Total amounts.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-bridge-ui.png',
							label:
								'Zeus desktop Bridge UI showing the Across Protocol risk warning by default and the Network / Bridge / Total fee breakdown',
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
						walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
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
				{
					explanation:
						'Network Settings lists every RPC endpoint with its URL, enabled state, status, archive support, MEV Protect flag, and latency, and provides actions to add an RPC URL or enable a network.',
					file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-network-settings.png',
					label:
						'Zeus Network Settings listing three Arbitrum RPC endpoints with enabled, status, archive, MEV Protect, and latency columns, plus actions to add an RPC URL or enable a network',
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
										'Built-in Across bridge quotes fees from the Across suggested-fees API. Default URL is https://app.across.to/api/suggested-fees with `use_api` enabled by default, the user can change the API URL or disable the API in Across settings. The bridge deposit itself is submitted via the user-configured RPC.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/2d3c2dc631e2352405f1ee0dbda96d49f54eaf2d/src/gui/ui/dapps/across.rs',
									] as NonEmptyArray<string>,
								},
								{
									explanation:
										'The first time the Bridge UI is opened, Zeus shows a notice about the Across API it uses for the fee calculation. The notice states that the URL can be changed or disabled in the Bridge settings, and that no telemetry or data collection is involved.',
									file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-bridge-across-notice.png',
									label:
										'Zeus Across API notice shown on first opening the Bridge UI, explaining the fee calculation request and that the URL can be changed or disabled in the Bridge settings',
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
										'Railgun unshield defaults to a private broadcast path via the public Pimlico bundler URL (`https://public.pimlico.io/v2/{chainId}/rpc`). The user can point the bundler URL at a self-hosted Alto or use emergency self-broadcast.',
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
										'Zeus ships its default external RPC endpoints disabled and lets the user add custom RPC URLs, so no chain traffic happens until at least one endpoint is enabled. Once an endpoint is enabled, which is required for normal chain use, that operator learns the user IP address and the usual RPC contents without any further privacy prompt. The background ETH balance refresh batches every configured wallet address into a single StateView getETHBalance call via batch::get_eth_balances, so one request can carry many addresses at once, while ERC-20 balance refreshes are per-owner. That batch is what makes the addresses correlatable to each other. The default host list can change between releases, so this row covers any user-enabled or custom RPC rather than naming individual providers. Users who only ever talk to their own node avoid external providers entirely.',
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
										'Zeus can check GitHub for a newer release on startup, but the check is off by default. It is offered as an unchecked "Check for Updates" box during onboarding, and can be changed at any time in settings. The only other external calls Zeus makes are the optional token icon downloads and the optional Sourcify contract name lookup, which are consented the same way and are also off by default.',
									url: [
										'https://github.com/greekfetacheese/zeus/blob/7319b288f306f9157156f6b0f20de378a3a45d8e/src/utils/self_update.rs',
										'https://github.com/greekfetacheese/zeus/blob/7f1dfb05eb17263bedfd07ca05bd9c542dab41c6/src/gui/ui/auth.rs',
										'https://github.com/greekfetacheese/zeus/blob/0bb887c65260c2a1cbb700470fd2d29cd6bc77ed/src/core/types.rs',
									] as NonEmptyArray<string>,
								},
								{
									explanation:
										'The External Data onboarding step names each of the three optional network calls and asks the user to opt into them individually. All three start unselected and can be changed later in settings.',
									file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-external-data-onboarding.png',
									label:
										'Zeus External Data onboarding step listing the three optional network calls, covering token icons, contract names, and the update check, with all three options unselected',
								},
							],
							byEntity: github,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.PROMPTED,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.UPDATE_CHECKING],
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
								{
									explanation:
										'Railgun is not enabled by default: the onboarding step explains that enabling it syncs private notes in the background and that proving circuits may need to be downloaded. Both permissions are asked for separately and neither is enabled in advance.',
									file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-railgun-onboarding.png',
									label:
										'Zeus Railgun Privacy onboarding step with Enable Railgun and Allow Circuit Download options, noting that the feature is optional and that a small set of circuits is already bundled',
								},
							],
							byEntity: github,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.PROMPTED,
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
					{
						explanation:
							'Recovery is the same screen a first-time user sees: it asks for the username and password that the wallet was derived from, and there is no separate seed phrase to enter.',
						file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-wallet-recovery.png',
						label:
							'Zeus recovery screen titled No vault was found, asking for the username and password with Recover and Import Data actions',
					},
				],
				drills: notSupported,
				guardianRecovery: notSupported,
			}),
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refNotNecessary,
				wallets: {},
			},
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
			publicSecurityAudits: [],
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
						{
							explanation:
								'Zeus shows the recipient as an unknown address in the warning color whenever the address is neither a wallet in the account nor a saved contact. The same warning appears in the bridge and in the shield and unshield flows.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-send-unknown-recipient.png',
							label:
								'Zeus Send Crypto form with the recipient marked as Unknown Address in the warning color',
						},
					],
					addressPoisoningDetection: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					userWhitelist: true,
				}),
				unlimitedApprovalWarning: supported({
					ref: [
						{
							explanation:
								'Zeus warns before confirming an unlimited approval: the confirmation window is titled "Unlimited Token Approval" in red and shows the granted allowance as "Unlimited USDC" in the warning color.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-unlimited-approval-warning.png',
							label:
								'Zeus confirmation window titled "Unlimited Token Approval" in red, showing the allowance as Unlimited USDC',
						},
						{
							explanation:
								'For transactions that did not originate from Zeus itself, the confirmation window renders the transaction title in the error color when the transaction is an unlimited approval or permit. The approval row shows the amount as `Unlimited` in the warning color.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/064cbb70706300c5a2e5e640816a68d1004eb80f/src/gui/ui/tx/confrim_window.rs',
								'https://github.com/greekfetacheese/zeus/blob/851e1e0e700932dfbf297849fcd803e6d4ef506f/src/gui/ui/tx/events.rs',
							] as NonEmptyArray<string>,
						},
					],
					leaksSpenderAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					warnsOnUnlimitedApproval: true,
				}),
			},
			securityBestPractices: {
				browser: 'NOT_A_BROWSER_EXTENSION',
				desktop: {
					ref: [
						{
							explanation:
								'Zeus derives the master HD wallet from the username and password using Argon2Id with a fixed high-cost parameter set, and persists it in a vault encrypted with those same credentials. The stored key material is protected by a standardized key derivation function rather than an ad-hoc scheme. Zeus does not generate the master key from a random number generator: its entropy comes from the user credentials. The keys Zeus does generate itself, such as the Railgun database key and the wallet state key, use the operating system CSPRNG.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/7f1dfb05eb17263bedfd07ca05bd9c542dab41c6/src/core/vault.rs',
								'https://github.com/greekfetacheese/zeus/blob/074bb7e82633e65d498176f67f8f3e957fffae0d/readme.md#how-the-wallet-recovery-works',
							] as NonEmptyArray<string>,
						},
					],
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				mobile: 'NOT_A_MOBILE_APP',
			},
			transactionLegibility: supported({
				ref: [
					{
						explanation:
							"Zeus simulates every transaction locally and shows the effect on the user's own account before signing. The confirmation window displays decoded events together with the resulting balance and approval changes. A transaction that would revert cannot be submitted at all, because the simulation returns the revert reason as an error.",
						url: [
							'https://github.com/greekfetacheese/zeus/blob/064cbb70706300c5a2e5e640816a68d1004eb80f/src/core/tx/analysis.rs',
							'https://github.com/greekfetacheese/zeus/blob/a87a05bad4c3b53438584bcbf9667de1e08c8dc6/src/core/tx/approval_diff.rs',
							'https://github.com/greekfetacheese/zeus/blob/30b0c641abe524f4e7e0e36af3e6356092b0128a/src/core/tx/sim_diff.rs',
						] as NonEmptyArray<string>,
					},
					{
						explanation:
							'The same window shows the simulated balance and approval changes for the transaction, so the effect on the account is explained before signing.',
						file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-aave-supply-clearsigning.png',
						label:
							'Zeus confirmation window for an Aave supply call, showing the decoded Amount to supply and Collateral recipient fields with the simulated balance and approval changes',
					},
				],
				erc4361: notSupportedWithRef({
					ref: [
						{
							explanation:
								'A Sign-In With Ethereum request reaches Zeus as a generic `personal_sign` call. Zeus displays the message text but does not recognize or reformat a SIWE request.',
							url: 'https://github.com/greekfetacheese/zeus/blob/470ee192207be2a2e7740fa8c4f6278066366464/src/server.rs',
						},
					],
				}),
				erc7730: supported({
					ref: [
						{
							explanation:
								'Zeus resolves ERC-7730 calldata descriptors by the contract being called, from a pinned clear signing registry, and shows the descriptor-driven description instead of raw calldata whenever a descriptor matches.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/d52e9b52e37fae48cf4e760488a8b1aedbe276ec/src/core/clear_signing/mod.rs',
								'https://github.com/greekfetacheese/zeus/blob/d0ee95eb80a4d4d75a2769e9e17dfd01d3e41c3d/src/core/clear_signing/registry.rs',
							] as NonEmptyArray<string>,
						},
						{
							explanation:
								'The pinned registry ships an Aave `V3` Pool calldata descriptor, which is what resolves the Aave supply benchmark. It ships no descriptor for a plain ERC-20 `approve` on USDC, and Zeus has no handling of Safe `execTransaction` or `multiSend` inner calldata.',
							url: 'https://github.com/greekfetacheese/zeus/blob/b5d8491e01f1346ccafa5e32cf48ecd1e6d890b5/src/core/clear_signing/registry_pins.rs',
						},
						{
							explanation:
								'Zeus decodes this Aave supply call from the ERC-7730 descriptor in that registry. The window is titled with the descriptor owner and contract name, and the `supply` arguments are labeled Amount to supply and Collateral recipient, which are the descriptor field labels rather than raw argument positions.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-aave-supply-clearsigning.png',
							label:
								'Zeus confirmation window for an Aave supply call, showing the descriptor-driven Amount to supply and Collateral recipient fields',
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				erc8213: supported({
					ref: [
						{
							explanation:
								'The confirmation window shows the decoded call by default. The raw hex calldata is reachable behind the `Raw` action of the calldata window, there is no way to copy that calldata to the clipboard, and no calldata digest is shown.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/851e1e0e700932dfbf297849fcd803e6d4ef506f/src/gui/ui/tx/mod.rs',
								'https://github.com/greekfetacheese/zeus/blob/064cbb70706300c5a2e5e640816a68d1004eb80f/src/gui/ui/tx/confrim_window.rs',
							] as NonEmptyArray<string>,
						},
						{
							explanation:
								'The `Raw` calldata view is opened from the Calldata tab and shows the raw hex bytes for the call. The decoded description is what the user sees by default, so the raw bytes are one click away.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-raw-calldata-modal.png',
							label:
								'Zeus Raw calldata modal showing the raw hex calldata of the same Aave supply call, opened from the Calldata tab',
						},
						{
							explanation:
								'Zeus renders an EIP-712 typed data request as decoded struct fields: the `EIP712Domain` fields and the message fields are listed with their declared types. No domain separator hash, message hash, or signing digest appears in this window.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-eip712-typed-data.png',
							label:
								'Zeus Sign Message window for an EIP-712 typed data request, showing the decoded domain and message struct fields with their types',
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
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
					gas: DataDisplayOptions.NOT_IN_UI,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ETH_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
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
			}),
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							'Zeus lists the ERC-20 and `Permit2` allowances it has recorded and lets the user revoke either kind from the approvals screen. An ERC-20 allowance is revoked with an approve transaction for a zero amount, and a `Permit2` allowance with a `Permit2` approve transaction for a zero amount. The list is scoped to local activity: it only tracks approvals observed in transactions that Zeus itself recorded, so approvals granted through other wallets do not appear.',
						url: [
							'https://github.com/greekfetacheese/zeus/blob/26ca417a3a2ed8bfc412ba20e617513b3da70167/src/gui/ui/approvals.rs',
							'https://github.com/greekfetacheese/zeus/blob/644518bc1d8c2e82f9afc63dfbbf3b6f24c0b15f/src/core/context/approval_manager.rs',
						] as NonEmptyArray<string>,
					},
					{
						explanation:
							"Zeus's built-in Uniswap swap approves the canonical `Permit2` contract with an unlimited token allowance (the maximum `U256` value), one time per token. The `Permit2` allowance it grants the swap router is for exactly the swap input amount and expires 30 days after signing; an existing allowance that is still sufficient and not expired is reused instead of signing again. The unlimited token approval is rendered before signing with its amount displayed as `Unlimited` and cannot be edited.",
						url: [
							'https://github.com/greekfetacheese/zeus/blob/74f456caf5b9953e4d69eeb5c9f7e6aa610af2f0/src/gui/ui/dapps/uniswap/swap.rs',
							'https://github.com/greekfetacheese/zeus/blob/2074e6f655ab273af998b22e6680178b79185139/src/core/signature/mod.rs',
						] as NonEmptyArray<string>,
					},
					{
						explanation:
							'The approvals screen lists each recorded allowance with its asset, chain, wallet, spender, amount, and type, and offers a revoke action per row. Both ERC-20 and Permit2 allowances appear in the list.',
						file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-approvals-screen.png',
						label:
							'Zeus Approvals screen listing 13 active approvals with the asset, chain, wallet, spender, amount, and type columns, and a Revoke action on each row',
					},
					{
						explanation:
							'Revoking an allowance sends an approval with an amount of zero for the selected spender, clearing it rather than reducing it.',
						file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-revoke-approval-confirmation.png',
						label:
							'Zeus Revoke Token Approval confirmation window showing a 0.00 USDC allowance being set for the Permit2 spender on Base',
					},
				],
				approvalsManagement: supported({
					erc1155Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
				}),
				builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.UNLIMITED_BUT_DISCLOSED,
			},
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
						{
							explanation:
								'The swap form shows the routing details before the confirmation window opens, including slippage, the minimum received, and the price impact.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-swap-ui.png',
							label:
								'Zeus Swap form showing the sell and buy amounts with routing details: slippage, minimum received, and price impact',
						},
						{
							explanation:
								'The swap confirmation window then shows what the user pays and receives together with the estimated network cost.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-swap-eth-to-usdc-confirmation.png',
							label:
								'Zeus Swap confirmation window for an ETH to USDC swap, showing the amounts paid and received, the minimum received, and the estimated cost',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				erc20L1Transfer: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show the exact tokens the recipient will receive in case of a token tax but it does not breakdown the fees if any.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
						{
							explanation:
								'The ERC-20 transfer confirmation window shows the token amount, the recipient, and the actual amount sent.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-erc20-transfer-confirmation.png',
							label:
								'Zeus ERC-20 Transfer confirmation window showing the token amount, the recipient, and the actual amount sent',
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
						{
							explanation:
								'The ETH transfer confirmation window shows the amount sent, the recipient, and the estimated network cost.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-eth-transfer-confirmation.png',
							label:
								'Zeus Transfer confirmation window for an ETH send, showing the amount, the recipient, and the estimated cost',
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
						{
							explanation:
								'The same confirmation window for a USDC to ETH swap shows the token amounts paid and received, the minimum received, and the estimated network cost.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-swap-usdc-to-eth-confirmation.png',
							label:
								'Zeus Swap confirmation window for a USDC to ETH swap, showing the amounts paid and received, the minimum received, and the estimated cost',
						},
					],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
			orderflowPractices: {
				disclosure: {
					ref: [
						{
							explanation:
								'Zeus shows a single "MEV Protect is enabled" or "MEV Protect is disabled" line with an on/off indicator in the transaction confirmation window, with no further orderflow detail. It appears for actions that involve slippage, such as swaps, and for unknown or EOA delegation actions. The MEV Protect flag is configured per RPC endpoint in Network Settings.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/064cbb70706300c5a2e5e640816a68d1004eb80f/src/gui/ui/tx/confrim_window.rs',
								'https://github.com/greekfetacheese/zeus/blob/3b95dd32b3b7e949bd71c7969e4231d0faa9c540/src/gui/ui/settings/networks.rs',
							] as NonEmptyArray<string>,
						},
						{
							explanation:
								'The MEV Protect switch is exposed to the user in the swap settings in addition to the flag on each RPC endpoint in Network Settings. Routing is computed locally and the transaction is submitted through the selected RPC endpoint.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-swap-settings.png',
							label:
								'Zeus swap settings panel showing the MEV Protect switch alongside slippage, deadline, max hops, max routes, split routing, swap versions, and simulate mode',
						},
						{
							explanation:
								'The MEV Protect flag is shown as a column for each endpoint in Network Settings, so the user can see which endpoints offer a protected route.',
							file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-network-settings.png',
							label: 'Zeus Network Settings showing the MEV Protect column for each RPC endpoint',
						},
					],
					afterSingleAction: OrderflowDisclosureLevel.MENTIONED,
					byDefault: OrderflowDisclosureLevel.MENTIONED,
				},
				practicesPage: notSupported,
				userCanRemoveAuctioning: notSupportedWithRef({
					ref: [
						{
							explanation:
								'Zeus does not auction orderflow, so there is no auctioning for the user to remove. Swap quotes and simulations are computed locally by the app, and transactions are submitted through the RPC endpoints the user chooses, or through a private MEV Protect endpoint when one is enabled.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/1586442ca4040477c5f79857602edb80341572a8/src/core/context/client.rs',
								'https://github.com/greekfetacheese/zeus/blob/3b95dd32b3b7e949bd71c7969e4231d0faa9c540/src/gui/ui/settings/networks.rs',
							] as NonEmptyArray<string>,
						},
					],
				}),
			},
			releaseTransparency: {
				artifactSigning: supported<ArtifactSigningDetails>({
					ref: [
						{
							explanation:
								'Zeus signs every release archive with `minisign`. The signature ships inside the archive as `signature.minisig` and covers the `zeus-gui` binary, and the built-in updater verifies it against a `minisign` public key embedded in the application before replacing the running binary, refusing the update if verification fails.',
							url: [
								'https://github.com/greekfetacheese/zeus/blob/7319b288f306f9157156f6b0f20de378a3a45d8e/src/utils/self_update.rs',
								'https://github.com/greekfetacheese/zeus/releases',
							] as NonEmptyArray<string>,
						},
					],
					publication: 'GITHUB_RELEASE',
					signer: 'DEVELOPER_KEY',
				}),
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'Zeus commits its `Cargo.lock`, so release builds resolve every Rust dependency to the exact locked version.',
							url: 'https://github.com/greekfetacheese/zeus/blob/9b40cac346b786930bd3c969567e14d3eeaa4fcd/Cargo.lock',
						},
					],
				}),
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: supported({
					ref: {
						explanation:
							'Every Zeus release publishes release notes in its GitHub release, organized into Added, Changed, and Fixed sections.',
						url: 'https://github.com/greekfetacheese/zeus/releases',
					},
				}),
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: supported({
			ref: [
				{
					explanation:
						'Zeus implements the EIP-5792 Wallet Call API: `wallet_sendCalls`, `wallet_getCapabilities`, and `wallet_getCallsStatus` are handled by its RPC server, and it reports the `atomicBatch` capability with the `atomic` status `supported` on Ethereum. Batched calls execute through the delegated EIP-7702 account.',
					url: [
						'https://github.com/greekfetacheese/zeus/blob/470ee192207be2a2e7740fa8c4f6278066366464/src/server.rs',
						'https://github.com/greekfetacheese/zeus/blob/d903ab798ac49ae08dbad00c3a8d644432dfd178/src/core/tx/send_calls.rs',
					] as NonEmptyArray<string>,
				},
				{
					explanation:
						'Zeus confirmation window for the Walletbeat test app batched call request, showing the wallet delegation to `Simple7702Account` together with the balance and approval changes of the batched calls.',
					file: 'public/references/wallets/zeus/screenshots/2026-09-26-zeus-wallet-delegation-confirmation.png',
					label:
						'Zeus confirmation window for a Walletbeat batched call request, showing the wallet delegation to the 7702 implementation contract with the resulting balance and approval changes',
				},
			],
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.DESKTOP]: true,
	},
}
