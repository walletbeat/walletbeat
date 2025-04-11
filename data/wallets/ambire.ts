import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { Variant } from '@/schema/variants'
import { RpcEndpointConfiguration } from '@/schema/features/chain-configurability'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { License } from '@/schema/features/license'
import { pashov } from '../entities/pashov-audit-group'
import { hunterSecurity } from '../entities/hunter-security'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { jiojosbg } from '../contributors/jiojosbg'
import { Leak, MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import type { References } from '@/schema/reference'
import { pimlico } from '../entities/pimlico'
import { ambireEntity } from '../entities/ambire'
import { biconomy } from '../entities/biconomy'
import { lifi } from '../entities/lifi'
import { github } from '../entities/github'
import { jiffylabs } from '../entities/jiffyscan'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'

const v2Audits: SecurityAudit[] = [
	{
		variantsScope: { [Variant.BROWSER]: true },
		unpatchedFlaws: 'ALL_FIXED',
		auditor: pashov,
		auditDate: '2024-01-26',
		codeSnapshot: {
			date: '2023-11-08',
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Pashov-Ambire-third-security-review.md',
	},
	{
		variantsScope: { [Variant.BROWSER]: true },
		unpatchedFlaws: 'NONE_FOUND',
		auditor: hunterSecurity,
		auditDate: '2025-02-20',
		codeSnapshot: {
			date: '2025-02-17',
			commit:
				'https://github.com/AmbireTech/ambire-common/commit/de88e26041db8777468f384e56d5ad0cb96e29a5',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
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
			explanation: "Ambire's NFT CDN is responsible for fetching NFT media.",
			url: 'https://nftcdn.ambire.com',
		},
	],
	pimlico: [
		{
			explanation: 'Pimlico is used as a Bundler and gas estimation helper.',
			url: 'https://api.pimlico.io',
		},
	],
	biconomy: [
		{
			explanation: 'Pimlico is used as a Bundler and gas estimation helper.',
			url: 'https://bundler.biconomy.io',
		},
	],
	lifi: [
		{
			explanation: 'Ambire uses LiFi as bridge and swap API.',
			url: 'https://li.quest',
		},
	],
	github: [
		{
			explanation: 'Used for static content and info lists.',
			url: ['https://raw.githubusercontent.com', 'https://github.com', 'https://api.github.com'],
		},
	],
	jiffylabs: [
		{
			explanation: 'User for fetching info about AA operations.',
			url: 'https://api.jiffyscan.xyz',
		},
	],
}

export const ambire: Wallet = {
	metadata: {
		id: 'ambire',
		displayName: 'Ambire',
		tableName: 'Ambire',
		iconExtension: 'svg',
		blurb: paragraph(`
			The first hybrid Account abstraction wallet to support Basic (EOA) and Smart accounts, 
			improving security and user experience.
			`),
		url: 'https://ambire.com',
		repoUrl: 'https://github.com/AmbireTech/extension',
		contributors: [jiojosbg],
		lastUpdated: '2025-03-20',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: {
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			customChains: true,
			ref: {
				url: [
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/consts/networks.ts',
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/services/ensDomains/ensDomains.ts',
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/libs/portfolio/getOnchainBalances.ts',
				],
				label: 'List of RPCs Ambire uses for default chains',
				explanation: "Ambire executes generic RPC requests to get user's balance and ENS.",
			},
		},

		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eoa: supported({
				canExportPrivateKey: true,
				canExportSeedPhrase: true,
				keyDerivation: {
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
					type: 'BIP32',
					canExportSeedPhrase: true,
				},
			}),
			eip7702: supported({
				contractCode: {
					keyRotationTransactionGeneration: TransactionGenerationCapability.IMPOSSIBLE,
					controllingSharesInSelfCustodyByDefault: 'YES',
					tokenTransferTransactionGeneration:
						TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
					ref: {
						url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount7702.sol',
						explanation: 'Ambire supports EIP-7702 smart contract wallets',
					},
				},
				ref: {
					url: 'https://blog.ambire.com/eip-7702-wallet',
					explanation:
						'Ambire is AA wallet by default. With the introduction of EIP-7702 it allows you to use your existing EOA just like you would use any smart account wallet!',
				},
			}),
			mpc: notSupported,
			rawErc4337: supported({
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount.sol',
					explanation: 'Ambire supports ERC-4337 smart contract wallets',
				},
			}),
		},

		multiAddress: featureSupported,
		addressResolution: {
			nonChainSpecificEnsResolution: supported({
				medium: 'CHAIN_CLIENT',
			}),
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
		},
		integration: {
			browser: {
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
				ref: {
					url: 'https://github.com/AmbireTech/extension/blob/v2/src/web/extension-services/background/background.ts',
				},
			},
		},
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://immunefi.com/bug-bounty/ambire/information/',

				details: `Rewards are distributed according to the impact of the vulnerability based on the Immunefi Vulnerability Severity Classification System V2.2. This is a simplified 5-level scale, with separate scales for websites/apps and smart contracts/blockchains, encompassing everything from consequence of exploitation to privilege required to likelihood of a successful exploit.

All High and Critical Smart Contract bug reports require a PoC and a suggestion for a fix to be eligible for a reward. All Low and Medium Smart contract bug reports require a suggestion for a fix to be eligible for a reward.

The following vulnerabilities are not eligible for a reward:

https://github.com/AmbireTech/code4rena#known-tradeoffs

Payouts are handled by the Ambire team directly and are denominated in USD. However, payouts are done in ETH unless agreed otherwise.`,
				upgradePathAvailable: false,
			},
			scamAlerts: {
				scamUrlWarning: supported({
					leaksVisitedUrl: 'NO',
					leaksUserAddress: false,
					leaksIp: false,
					ref: {
						urls: [
							{
								url: 'https://github.com/AmbireTech/ambire-common/blob/v2/src/controllers/phishing/phishing.ts',
								label: 'Implementation',
							},
						],
						explanation:
							"Every 6 hours, Ambire downloads a list of publicly available known scam URLs from an external API. Then, it checks if the website you're connecting to is on that list. If it is, a warning is displayed.",
						lastRetrieved: '2025-04-02',
					},
				}),
				contractTransactionWarning: notSupported,
				sendTransactionWarning: notSupported,
			},
			publicSecurityAudits: v2Audits,
			lightClient: {
				ethereumL1: notSupported,
			},
			hardwareWalletSupport: {
				[Variant.BROWSER]: {
					supportedWallets: {
						[HardwareWalletType.LEDGER]: featureSupported,
						[HardwareWalletType.GRIDPLUS]: featureSupported,
						[HardwareWalletType.TREZOR]: featureSupported,
						[HardwareWalletType.FIREFLY]: notSupported,
						[HardwareWalletType.KEEPKEY]: notSupported,
						[HardwareWalletType.KEYSTONE]: notSupported,
					},
					ref: [
						{
							url: 'https://www.ambire.com/',
						},
					],
				},
			},
			hardwareWalletClearSigning: {
				level: ClearSigningLevel.FULL,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
		},
		privacy: {
			dataCollection: {
				onchain: {},
				collectedByEntities: [
					{
						entity: ambireEntity,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
							},
							mempoolTransactions: Leak.ALWAYS,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.ambire,
						},
					},
					{
						entity: pimlico,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							mempoolTransactions: Leak.ALWAYS,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.pimlico,
						},
					},
					{
						entity: biconomy,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							mempoolTransactions: Leak.ALWAYS,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.biconomy,
						},
					},
					{
						entity: lifi,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.NEVER,
							mempoolTransactions: Leak.NEVER,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.lifi,
						},
					},
					{
						entity: github,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.NEVER,
							mempoolTransactions: Leak.NEVER,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.github,
						},
					},
					{
						entity: jiffylabs,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.NEVER,
							mempoolTransactions: Leak.NEVER,
							cexAccount: Leak.NEVER,
							ref: dataLeakReferences.jiffylabs,
						},
					},
				],
			},
			privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20(26%20November%202021).pdf',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					arbitrum: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					opStack: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		license: {
			license: License.GPL_3_0,
			ref: 'https://github.com/AmbireTech/extension/blob/main/LICENSE',
		},
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: true,
				donations: false,
				ecosystemGrants: true,
				publicOffering: false,
				ventureCapital: true,
				transparentConvenienceFees: false,
				hiddenConvenienceFees: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
			},
			ref: null,
		},
		transparency: {
			feeTransparency: {
				level: FeeTransparencyLevel.DETAILED,
				disclosesWalletFees: true,
				showsTransactionPurpose: true,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: false,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
