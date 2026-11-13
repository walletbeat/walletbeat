import { alexanderchopan } from '@/data/contributors/alexanderchopan'
import { alchemy } from '@/data/entities/alchemy'
import { allnodes } from '@/data/entities/allnodes'
import { blockscout } from '@/data/entities/blockscout'
import { candide } from '@/data/entities/candide'
import { coinbase } from '@/data/entities/coinbase'
import { consensys } from '@/data/entities/consensys'
import { github } from '@/data/entities/github'
import { goPlus } from '@/data/entities/goplus'
import { pimlico } from '@/data/entities/pimlico'
import { uniswapLabs } from '@/data/entities/uniswap-labs'
import { zerion } from '@/data/entities/zerion'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	CollectionPolicy,
	type DataCollectionByEntity,
	DataCollectionPurpose,
	EntityRole,
	MultiAddressPolicy,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { WalletProfile } from '@/schema/features/profile'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type {
	ContractTransactionWarning,
	SendTransactionWarning,
} from '@/schema/features/security/scam-alerts'
import {
	IosUsageDescription,
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	SimulationBenchmarkTransactions,
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
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	FeeDisplayLevel,
	FeeType,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { type References, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { nonEmptySet } from '@/types/utils/non-empty'

const source =
	'https://github.com/alexanderchopan/casberi/blob/b7789bb29e48277dffd6f4871ce7d61c42b8a9dd'

const registryUrl = `${source}/Casberi/Casberi/Model/NetworkReach.swift`
const torUrl = `${source}/Casberi/Casberi/Model/TorRoute.swift#L3-L21`

const torNote =
	'On iOS the request goes through Tor, on a circuit that belongs to this one wallet address. If Tor cannot connect, the request is not sent another way.'

const accountNodeRef = (operator: string): References => [
	{
		explanation: `${operator} When an own node is set for the network, the account reads that node and does not contact this one. ${torNote}`,
		label: 'Hosts declared for the account',
		url: `${registryUrl}#L615-L660`,
	},
	{
		label: 'Default RPC nodes and bundlers per network',
		url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L33-L74`,
	},
	{
		label: 'Which requests go through Tor',
		url: torUrl,
	},
]

const accountNode = (
	byEntity: DataCollectionByEntity['byEntity'],
	operator: string,
): WithRef<DataCollectionByEntity> => ({
	ref: accountNodeRef(operator),
	byEntity,
	dataCollection: {
		[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
		[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
		endpoint: RegularEndpoint,
		multiAddress: {
			type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
		},
	},
	purposes: [
		DataCollectionPurpose.CHAIN_DATA_LOOKUP,
		DataCollectionPurpose.TRANSACTION_SIMULATION,
		DataCollectionPurpose.GAS_QUOTE,
	],
	role: EntityRole.OPERATOR,
})

const bundler = (
	byEntity: DataCollectionByEntity['byEntity'],
	explanation: string,
): WithRef<DataCollectionByEntity> => ({
	ref: [
		{
			explanation: `${explanation} ${torNote}`,
			label: 'Default RPC nodes and bundlers per network',
			url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L33-L74`,
		},
		{
			label: 'Which requests go through Tor',
			url: torUrl,
		},
	],
	byEntity,
	dataCollection: {
		[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
		[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
		[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
		endpoint: RegularEndpoint,
		multiAddress: {
			type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
		},
	},
	purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST, DataCollectionPurpose.GAS_QUOTE],
	role: EntityRole.OPERATOR,
})

const accountNodes: Array<WithRef<DataCollectionByEntity>> = [
	accountNode(
		consensys,
		'The default Ethereum node is the MEV Blocker RPC. The MEV Blocker site states that it was acquired by Special Mechanisms Group, and it links the Consensys privacy notice.',
	),
	accountNode(
		allnodes,
		'The public node service of Allnodes is the second node for each network, asked when the first one does not answer.',
	),
	accountNode(coinbase, 'The default Base node is the public Base RPC.'),
]

const bundlers: Array<WithRef<DataCollectionByEntity>> = [
	bundler(
		pimlico,
		'Each transaction from the account is an ERC-4337 user operation sent to the public Pimlico bundler.',
	),
	bundler(candide, 'The public Candide bundler is asked when the Pimlico bundler does not answer.'),
]

const contractAgeCheck: WithRef<DataCollectionByEntity> = {
	ref: [
		{
			explanation: `Before a send or a swap, Blockscout is asked when the recipient or token contract was made. The request names that contract and not the address of the user. ${torNote}`,
			label: 'Contract age lookup',
			url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L134-L160`,
		},
		{
			label: 'Hosts declared for the checks before a send',
			url: `${registryUrl}#L665-L676`,
		},
	],
	byEntity: blockscout,
	dataCollection: {
		[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
		endpoint: RegularEndpoint,
		multiAddress: null,
	},
	purposes: [DataCollectionPurpose.SCAM_DETECTION],
	role: EntityRole.OPERATOR,
}

const sendFlow: Array<WithRef<DataCollectionByEntity>> = [
	...accountNodes,
	...bundlers,
	{
		ref: [
			{
				explanation: `Before a send, GoPlus is asked whether the recipient address was reported. The request names the recipient and not the address of the user. ${torNote}`,
				label: 'Recipient screening requests',
				url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L73-L132`,
			},
			{
				label: 'Hosts declared for the checks before a send',
				url: `${registryUrl}#L665-L676`,
			},
		],
		byEntity: goPlus,
		dataCollection: {
			[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
			endpoint: RegularEndpoint,
			multiAddress: null,
		},
		purposes: [DataCollectionPurpose.SCAM_DETECTION],
		role: EntityRole.OPERATOR,
	},
	contractAgeCheck,
	{
		ref: [
			{
				explanation:
					'The sanctions list is one public file downloaded whole from GitHub once a day and matched on the device. The request names no wallet address.',
				label: 'Recipient screening requests',
				url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L73-L132`,
			},
		],
		byEntity: github,
		dataCollection: {
			[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
			endpoint: RegularEndpoint,
			multiAddress: null,
		},
		purposes: [DataCollectionPurpose.SCAM_DETECTION, DataCollectionPurpose.STATIC_ASSETS],
		role: EntityRole.OPERATOR,
	},
]

export const casberi: SoftwareWallet = {
	metadata: {
		id: 'casberi',
		displayName: 'Casberi',
		tableName: 'Casberi',
		coinspectId: null,
		contributors: [alexanderchopan],
		iconExtension: 'svg',
		lastUpdated: '2026-11-11',
		urls: {
			docs: ['https://casberi.app/docs.html'],
			repositories: ['https://github.com/alexanderchopan/casberi'],
			socials: {
				x: 'https://x.com/casberi_app',
			},
			websites: ['https://casberi.app'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: [
					{
						explanation:
							'The Safe is set up with the Safe 4337 module as module and fallback handler. Every send is an ERC-4337 user operation for the entry point contract at version 0.7, with no paymaster.',
						label: 'Safe 4337 module and entry point used by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccount.swift#L3-L76`,
					},
				],
				contract: {
					name: 'Safe 1.4.1 (SafeL2) with Safe4337Module 0.3.0',
					address: '0x29fcb43b46531bca003ddc8fcb67ffe91900c762',
					eip7702Delegatable: false,
					methods: {
						isValidSignature: featureSupported,
						validateUserOp: featureSupported,
					},
					sourceCode: {
						ref: 'https://github.com/safe-fndn/safe-smart-account/blob/bf943f80fec5ac647159d26161446ac5d716a294/contracts/SafeL2.sol#not-line-specific',
						available: true,
					},
				},
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: [
					{
						explanation:
							'The account is a Safe 1.4.1 behind the Safe proxy factory, with the Safe 4337 module as module and fallback handler. The address is computed on the device and the first send on each network deploys the Safe.',
						label: 'Safe contracts and setup used by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccount.swift#L3-L76`,
					},
					{
						explanation:
							'Owner changes are built on the device as Safe owner calls. A cosigner or an outside key is added with `addOwnerWithThreshold`, and a required cosigner raises the threshold to 2.',
						label: 'Owner and threshold changes built on the device',
						url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L446-L463`,
					},
				],
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
			ref: [
				{
					explanation:
						'A typed ENS name is resolved onchain through the ENS Universal Resolver with `eth_call`. An offchain gateway is asked only for names that answer with `OffchainLookup`.',
					label: 'ENS resolution on chain first',
					url: `${source}/Casberi/Casberi/Model/ENS.swift#L49-L70`,
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
		chainAbstraction: null,
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation:
						'The Nodes page takes one RPC address per network for Ethereum, Base and Robinhood Chain. The address must answer eth_chainId for that network. A node that is set is used directly and alone, with no fallback. The page is reached after the account exists.',
					label: 'Own node per network',
					url: `${source}/Casberi/Casberi/Model/OwnNode.swift#not-line-specific`,
				},
				{
					explanation:
						'User operations are always sent to the public Pimlico and Candide bundlers, also when an own node is set.',
					label: 'Default RPC nodes and bundlers per network',
					url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L33-L74`,
				},
			],
			customChainRpcEndpoint: notSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: notSupported,
					erc20BalanceLookup: featureSupported,
					erc20TokenSend: notSupported,
					etherBalanceLookup: featureSupported,
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
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'Casberi is licensed under GPL-3.0-or-later, with a section 7 additional permission for linking the `reown-swift` library.',
						label: 'Casberi license',
						url: `${source}/LICENSE#not-line-specific`,
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Swaps are written on the device against the Uniswap, Aerodrome and Sushi routers. No fee recipient, partner fee or referral code is added to a swap.',
					label: 'Swap calls built on the device with no wallet fee',
					url: `${source}/Casberi/Casberi/Model/YourAccountSwap.swift#L3-L30`,
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
			appIsolation: null,
			dataCollection: {
				[UserFlow.INSTALL]: null,
				[UserFlow.ONBOARDING_IMPORT]: null,
				[UserFlow.ONBOARDING_NEW]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND_ETHER]: {
					collected: sendFlow,
				},
				[UserFlow.SEND_USDC]: {
					collected: sendFlow,
				},
				[UserFlow.APP_CONNECTION]: null,
				[UserFlow.MAKE_TRANSACTION]: null,
				[UserFlow.NATIVE_SWAP]: {
					collected: [
						...accountNodes,
						...bundlers,
						contractAgeCheck,
						{
							ref: [
								{
									explanation:
										'The Uniswap token list is one public file that names no wallet address. Swap quotes are read from the pool contracts through the account node, with no quote service.',
									label: 'Hosts declared for the account',
									url: `${registryUrl}#L615-L660`,
								},
							],
							byEntity: uniswapLabs,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								endpoint: RegularEndpoint,
								multiAddress: null,
							},
							purposes: [DataCollectionPurpose.ASSET_METADATA],
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.UNCLASSIFIED]: {
					collected: [
						{
							ref: [
								{
									explanation: `Balances and history of the account and of each followed address are read from Zerion, one address in each request. ${torNote}`,
									label: 'Zerion request for one wallet address',
									url: `${source}/Casberi/Casberi/Model/ZerionAPI.swift#L222-L227`,
								},
								{
									label: 'Hosts declared for wallet reads',
									url: `${registryUrl}#L240-L277`,
								},
								{
									label: 'Which requests go through Tor',
									url: torUrl,
								},
							],
							byEntity: zerion,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
									bestChain: null,
									destination: 'SAME_FOR_ALL',
									proxy: 'SEPARATE_CIRCUITS',
									timing: 'SIMULTANEOUS',
								},
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TOKEN_PRICE_LOOKUP,
							],
							role: EntityRole.OPERATOR,
						},
						{
							ref: [
								{
									explanation:
										'Alchemy is the fallback when Zerion does not answer. Its portfolio request carries up to three wallet addresses at once, so Alchemy can link those addresses to each other. The request goes through Tor on iOS.',
									label: 'Alchemy fallback request with up to three addresses',
									url: `${source}/Casberi/Casberi/Model/WalletIngest.swift#L2918-L2923`,
								},
								{
									label: 'Hosts declared for wallet reads',
									url: `${registryUrl}#L240-L277`,
								},
							],
							byEntity: alchemy,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.NEVER,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
								},
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TOKEN_PRICE_LOOKUP,
							],
							role: EntityRole.OPERATOR,
						},
					],
				},
			},
			privacyPolicy: 'https://casberi.app/privacy.html',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: notSupported,
					[HardwareWalletType.TREZOR]: notSupported,
					[HardwareWalletType.GRIDPLUS]: notSupported,
					[HardwareWalletType.KEYSTONE]: notSupported,
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The signing key is a P-256 key made inside the Secure Enclave of the phone. It is stored for this device only, behind the device passcode and the enrolled biometrics, and is not synced.',
						label: 'Secure Enclave key generation and storage',
						url: `${source}/Casberi/Casberi/Model/YourAccountKey.swift#L135-L165`,
					},
					{
						explanation:
							'The recovery key is a second P-256 key made on the device with `CryptoKit`. It is stored in iCloud Keychain and signing with it asks for device owner authentication.',
						label: 'Recovery key generation and storage',
						url: `${source}/Casberi/Casberi/Model/YourAccountRecovery.swift#L28-L108`,
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: supported({
				ref: [
					{
						explanation:
							'The phone signs with a Secure Enclave P-256 key and builds the WebAuthn authenticator data itself, with no passkey API and no relying party. The signature is verified on chain by the Safe WebAuthn signer contracts, which call the RIP-7212 precompile first and the Daimo P-256 verifier as fallback.',
						label: 'WebAuthn signature built on the device and its onchain verifiers',
						url: `${source}/Casberi/Casberi/Model/SafeWebAuthnSignature.swift#L17-L50`,
					},
				],
				details:
					'Safe WebAuthn shared signer at 0x94a4F6affBd8975951142c3999aEAB7ecee555c2. Verifiers are the RIP-7212 precompile at 0x100, then the Daimo P-256 verifier at 0xc2b78104907F722DABAc4C69f826a522B2754De4.',
				library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
				libraryUrl: 'https://github.com/daimo-eth/p256-verifier',
			}),
			publicSecurityAudits: [],
			scamAlerts: {
				contractTransactionWarning: supported<ContractTransactionWarning>({
					ref: [
						{
							explanation:
								'A send to a contract younger than 30 days is flagged before signing. The contract age is read from Blockscout through Tor. The request carries the contract address and not the address of the user.',
							label: 'Contract age lookup',
							url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L134-L160`,
						},
					],
					contractRegistry: false,
					leaksContractAddress: true,
					leaksUserAddress: false,
					leaksUserIp: false,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported<SendTransactionWarning>({
					ref: [
						{
							explanation:
								'Before a send, the wallet reports a recipient that looks like an address the account paid before, a first send to an address, a sanctioned address and an address reported as a scam. Each of these needs a second tap to send, except the note about a first send.',
							label: 'Send warnings and their order',
							url: `${source}/Casberi/Casberi/Model/MoveWarnings.swift#L19-L96`,
						},
						{
							explanation:
								'The recipient address is sent to GoPlus through Tor. The sanctions list is downloaded whole and matched on the device.',
							label: 'Recipient screening requests',
							url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L73-L132`,
						},
					],
					addressPoisoningDetection: true,
					leaksRecipient: true,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: {
				browser: 'NOT_A_BROWSER_EXTENSION',
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'The signing key is created by the Secure Enclave and never leaves it. The app stores only the wrapped key blob, for this device only and only while a passcode is set.',
							label: 'Secure Enclave key creation',
							url: `${source}/Casberi/Casberi/Model/YourAccountKey.swift#L135-L165`,
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: {
						android: 'NOT_AN_ANDROID_APP',
						ios: {
							usageDescriptions: [
								IosUsageDescription.CAMERA,
								IosUsageDescription.FACE_ID,
								IosUsageDescription.MICROPHONE,
								IosUsageDescription.PHOTO_LIBRARY,
							],
						},
					},
					secureRng: SecureRngSource.HARDWARE_ENTROPY,
				},
			},
			transactionLegibility: {
				ref: [
					{
						explanation:
							'The Details page of a send or swap lists the recipient in full, the account, the nonce, the network fee, any approval with its spender and exact amount, and the simulation result.',
						label: 'Details page before signing',
						url: `${source}/Casberi/Casberi/Screens/MoveDetails.swift#L30-L160`,
					},
				],
				erc4361: supported({
					ref: [
						{
							explanation:
								'A Sign-In with Ethereum message is parsed by its grammar and summarized. The wallet warns when the message names a site other than the page that asked.',
							label: 'Sign-In with Ethereum parsing',
							url: `${source}/Casberi/Casberi/Model/SafeStatement.swift#L68-L152`,
						},
					],
				}),
				erc7730: supported({
					ref: [
						{
							explanation:
								'A snapshot of the ERC-7730 clear signing registry is bundled with the app and read on the device. Calldata is decoded from the raw bytes, with nested calls followed up to three levels. It is used when the phone cosigns a Safe transaction and when an app in the built-in browser asks for a transaction.',
							label: 'Bundled ERC-7730 registry and decoder',
							url: `${source}/Casberi/Casberi/Model/ClearSign.swift#L9-L28`,
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: null,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
				}),
				erc8213: supported({
					ref: [
						{
							explanation:
								'The Raw transaction page shows the hash that is signed as the EIP-712 Digest, the full calldata in hex with a copy button, and the Calldata Digest.',
							label: 'Raw transaction page',
							url: `${source}/Casberi/Casberi/Screens/MoveDetails.swift#L219-L299`,
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					messageSigningLegibility: null,
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_OPTIONALLY,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: null,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: null,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
					[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: null,
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							'The Permissions page lists ERC-20 approvals, `Permit2` approvals and operator approvals for ERC-721 and ERC-1155 collections, read from chain logs. Approvals of one single ERC-721 token are not listed.',
						label: 'Approvals read from chain logs',
						url: `${source}/Casberi/Casberi/Model/WalletApprovals.swift#not-line-specific`,
					},
					{
						explanation:
							'A revoke for the account is signed on the phone as one operation per network.',
						label: 'Revoke signed by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccountChain.swift#L2019-L2049`,
					},
					{
						explanation:
							'A swap approves exactly the amount sold, to exactly the router that spends it.',
						label: 'Exact approval for a swap',
						url: `${source}/Casberi/Casberi/Model/YourAccountSwap.swift#L12-L26`,
					},
				],
				approvalsManagement: supported({
					erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				}),
				builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT,
			},
			transactionSubmission: {
				l1: {
					ref: [
						{
							explanation:
								'Transactions from the account are ERC-4337 user operations sent to the public Pimlico and Candide bundlers.',
							label: 'Bundlers used per network',
							url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L33-L74`,
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					ref: [
						{
							explanation:
								'The account sends on Ethereum, Base and Robinhood Chain. It does not send on Arbitrum.',
							label: 'Networks the account sends on',
							url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L33-L74`,
						},
					],
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: [
						{
							explanation:
								'A swap shows the network fee as a ceiling in dollars and names the venue with its pool fee as a percentage. No wallet fee is charged.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
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
							units: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
						},
					},
				}),
				erc20L1Transfer: supported({
					ref: [
						{
							explanation:
								'A send shows the network fee before signing as a ceiling in dollars, or in ETH when no price is known.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
						},
					],
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				ethL1Transfer: supported({
					ref: [
						{
							explanation:
								'A send shows the network fee before signing as a ceiling in dollars, or in ETH when no price is known.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
						},
					],
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				uniswapUSDCToEtherSwap: null,
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: supported({
					ref: [
						{
							label: 'Swift package versions pinned in Package.resolved',
							url: `${source}/Casberi/Casberi.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved#not-line-specific`,
						},
					],
				}),
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: notSupported,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
