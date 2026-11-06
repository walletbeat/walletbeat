import { AryaS } from '@/data/contributors/4ryas'
import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const walletchan: SoftwareWallet = {
	metadata: {
		id: 'walletchan',
		displayName: 'WalletChan',
		tableName: 'WalletChan',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm, AryaS],
		iconExtension: 'png',
		lastUpdated: '2026-11-06',
		urls: {
			docs: ['https://docs.walletchan.com'],
			others: [
				{
					label: 'Chrome Web Store',
					url: 'https://chromewebstore.google.com/detail/walletchan/kofbkhbkfhiollbhjkbebajngppmpbgc',
				},
				{
					label: 'Firefox Add-ons',
					url: 'https://addons.mozilla.org/en-US/firefox/addon/walletchan/',
				},
			],
			repositories: ['https://github.com/walletchan/walletchan'],
			socials: {
				x: 'https://x.com/walletchan_',
			},
			websites: ['https://walletchan.com'],
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
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation:
						'Ethereum uses drpc.org as its default RPC endpoint. When the wallet opens for the first time, it asks this endpoint and the default endpoints of the other networks for the balances of the new account. This happens before the user can open the RPC settings, because there are no settings during setup.',
					label: 'WalletChan default Ethereum RPC endpoint',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/constants/chainRegistry.ts#L184-L190',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-onboarding-without-rpc-settings.png',
					label: 'WalletChan setup screen with no network settings',
					lastRetrieved: '2026-11-06',
				},
				{
					explanation:
						'The settings let the user add an RPC endpoint to each network, including Ethereum and L2 networks, and select it as the endpoint in use.',
					label: 'WalletChan RPC endpoint settings code',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/components/Settings/RpcEndpointManager.tsx#L316-L325',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-add-ethereum-rpc-endpoint.png',
					label: 'WalletChan form to add an Ethereum RPC endpoint',
					lastRetrieved: '2026-11-06',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-ethereum-self-hosted-rpc-in-use.png',
					label: 'WalletChan with a self-hosted Ethereum RPC endpoint in use',
					lastRetrieved: '2026-11-06',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-base-rpc-endpoints.png',
					label: 'WalletChan RPC endpoint list for Base',
					lastRetrieved: '2026-11-06',
				},
				{
					explanation:
						'The user can add a custom EVM network with its own RPC endpoint. WalletChan checks the chain ID of the endpoint before it saves the network.',
					label: 'WalletChan add network code',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/components/Settings/AddChain.tsx#L393-L401',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-add-custom-network.png',
					label: 'WalletChan form to add a custom network',
					lastRetrieved: '2026-11-06',
				},
				{
					explanation:
						'When the WalletChan portfolio service is not available, the wallet reads balances from the RPC endpoint of each network.',
					label: 'WalletChan portfolio fallback code',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/chrome/portfolio/tokenCatalog.ts#L70-L74',
				},
				{
					explanation:
						'WalletChan reads the Ether balance and ERC-20 balances in one multicall contract call to the RPC endpoint of the network.',
					label: 'WalletChan onchain balance code',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/chrome/portfolio/onchainBalances.ts#L114-L141',
				},
				{
					explanation:
						'With network access only to a self-hosted Ethereum node, the wallet shows the Ether balance and the balance of USDC added by its contract address. The balances are after a 10 USDC send. The RPC warning is about the other networks, which had no network access during the test.',
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-balances-from-self-hosted-node.png',
					label: 'WalletChan balances read from a self-hosted node',
					lastRetrieved: '2026-11-06',
				},
				{
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-send-token-picker-usdc-balance.png',
					label: 'WalletChan send screen with the USDC balance of an imported account',
					lastRetrieved: '2026-11-06',
				},
				{
					explanation:
						'WalletChan sends signed transactions to the RPC endpoint of the network with standard Ethereum RPC methods.',
					label: 'WalletChan transaction broadcast code',
					url: 'https://github.com/walletchan/walletchan/blob/7f33e0f3b47516c59cfe682b11ff19d8f44704dc/apps/extension/src/chrome/localSigning/transactionBroadcast.ts#L24-L75',
				},
				{
					explanation:
						'With network access only to a self-hosted Ethereum node, the wallet prepares a send of 10 USDC to another address. After confirmation, the node shows the transfer in the USDC balances of both addresses.',
					file: 'public/references/wallets/walletchan/screenshots/2026-11-06-walletchan-usdc-send-review.png',
					label: 'WalletChan USDC send review with a self-hosted node',
					lastRetrieved: '2026-11-06',
				},
			],
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
			delegation: null,
		},
		integration: {
			browser: {
				ref: [
					{
						explanation:
							'WalletChan announces itself to apps with EIP-6963. It also sets the standard provider object that older apps look for.',
						label: 'WalletChan provider announcement code',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/announcement.ts#L7-L58',
					},
					{
						explanation:
							'The provider offers the EIP-1193 request method and sends connect, account change and network change events.',
						label: 'WalletChan provider code',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/provider.ts#L22-L79',
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'The WalletChan browser extension code uses the GPL-3.0 license.',
						label: 'WalletChan extension license file',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/LICENSE.md#L5-L7',
					},
					{
						explanation:
							'The repository license file confirms that the extension code is under GPL-3.0.',
						label: 'WalletChan repository license file',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/LICENSE.md#L3-L12',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
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
		multiAddress: supported({
			ref: [
				{
					explanation:
						"The account switcher lists the user's accounts and lets the user pick one or add another.",
					label: 'WalletChan account switcher code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/components/AccountSwitcher.tsx#L15-L26',
				},
				{
					explanation:
						'WalletChan holds many accounts of different types, such as private key, seed phrase, Ledger, and Safe accounts.',
					label: 'WalletChan account types',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/IMPLEMENTATION.md#L5-L17',
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
			privacyPolicy:
				'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/PRIVACY_POLICY.md',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'WalletChan works with Ledger devices in Chrome and other Chromium browsers. The Firefox version does not offer Ledger.',
						label: 'WalletChan Ledger support',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/LEDGER.md#L1-L3',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webHID],
					}),
				},
			},
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
				hasPublicChangelog: supported({
					ref: {
						explanation: 'WalletChan keeps a public list of changes to its browser extension.',
						label: 'WalletChan changelog',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/CHANGELOG.md#L1-L7',
					},
				}),
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: [
				{
					explanation:
						'Private key and seed phrase accounts report atomic batch support on each network where WalletChan can run the batch as a single transaction.',
					label: 'WalletChan batch capability code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/batch/batchCapabilities.ts#L61-L105',
				},
				{
					explanation:
						'On networks with EIP-7702, such as Ethereum, WalletChan upgrades the account with a default smart account contract if it has none.',
					label: 'WalletChan smart account selection code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/utils/delegationResolution.ts#L11-L17',
				},
			],
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
