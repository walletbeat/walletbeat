import { alexanderchopan } from '@/data/contributors/alexanderchopan'
import type { SoftwareWallet } from '@/data/software-wallets'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { WalletProfile } from '@/schema/features/profile'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const source =
	'https://github.com/alexanderchopan/casberi/blob/b7789bb29e48277dffd6f4871ce7d61c42b8a9dd'

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
			dataCollection: null,
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
