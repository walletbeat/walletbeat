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
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { type References, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

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
		lastUpdated: '2026-11-18',
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
		accountSupport: null,
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
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
		licensing: null,
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
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
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: null,
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
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
