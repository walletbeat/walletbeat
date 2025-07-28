import { jiojosbg } from '@/data/contributors/jiojosbg'
import { nconsigny } from '@/data/contributors/nconsigny'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import {
	Leak,
	MultiAddressPolicy,
	RegularEndpoint,
} from '@/schema/features/privacy/data-collection'
import { WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { License } from '@/schema/features/transparency/license'
import type { References } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

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
		auditDate: '2024-01-26',
		auditor: pashov,
		codeSnapshot: {
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
			date: '2023-11-08',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Pashov-Ambire-third-security-review.md',
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		auditDate: '2025-02-20',
		auditor: hunterSecurity,
		codeSnapshot: {
			commit:
				'https://github.com/AmbireTech/ambire-common/commit/de88e26041db8777468f384e56d5ad0cb96e29a5',
			date: '2025-02-17',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
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
			explanation: "Ambire's NFT CDN is responsible for fetching NFT media.",
			url: 'https://nftcdn.ambire.com',
		},
	],
	biconomy: [
		{
			explanation: 'Pimlico is used as a Bundler and gas estimation helper.',
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
		contributors: [jiojosbg, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-03-20',
		repoUrl: 'https://github.com/AmbireTech/extension',
		url: 'https://ambire.com',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eip7702: supported({
				contract: ambireDelegatorContract,
				ref: {
					explanation:
						'Ambire is AA wallet by default. With the introduction of EIP-7702 it allows you to use your existing EOA just like you would use any smart account wallet!',
					url: 'https://blog.ambire.com/eip-7702-wallet',
				},
			}),
			eoa: supported({
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
				contract: ambireAccountContract,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					explanation: 'Ambire supports ERC-4337 smart contract wallets',
					url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount.sol',
				},
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
		},
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			crossChainBalances: {
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				ether: supported({
					perChainBalanceViewAcrossMultipleChains: featureSupported,
					crossChainSumView: notSupported,
					ref: {
						url: 'https://www.ambire.com/',
						explanation: 'Ambire supports filtering by token name.',
					},
				}),
				usdc: supported({
					perChainBalanceViewAcrossMultipleChains: featureSupported,
					crossChainSumView: notSupported,
					ref: {
						url: 'https://www.ambire.com/',
						explanation: 'Ambire supports filtering by token name.',
					},
				}),
				ref: {
					url: 'https://ambire.notion.site/Ambire-Wallet-Whitepaper-d502e54caf584fe7a67f9b0a018cd10f',
					explanation:
						'Ambire supports filtering by token name and chain, as well as displaying the total balance from the resulting tokens',
				},
			},

			/** Chain bridging features. */
			bridging: {
				/** Does the wallet have a built-in bridging feature? */
				builtInBridging: supported({
					risksExplained: 'NOT_IN_UI',
					feesLargerThan1bps: 'VISIBLE_BY_DEFAULT',
					ref: {
						url: 'https://www.ambire.com/',
						explanation: 'All fees are displayed when agreeing to the bridge',
					},
				}),
				suggestedBridging: notSupported,
			},
		},
		chainConfigurability: {
			customChains: true,
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			ref: {
				explanation: "Ambire executes generic RPC requests to get user's balance and ENS.",
				label: 'List of RPCs Ambire uses for default chains',
				url: [
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/consts/networks.ts',
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/services/ensDomains/ensDomains.ts',
					'https://github.com/AmbireTech/ambire-common/blob/v2/src/libs/portfolio/getOnchainBalances.ts',
				],
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
			eip5792: featureSupported,
		},
		license: {
			license: License.GPL_3_0,
			ref: 'https://github.com/AmbireTech/extension/blob/main/LICENSE',
		},
		monetization: {
			ref: null,
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
			dataCollection: {
				collectedByEntities: [
					{
						entity: ambireEntity,
						leaks: {
							cexAccount: Leak.NEVER,
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							ref: dataLeakReferences.ambire,
							walletAddress: Leak.ALWAYS,
						},
					},
					{
						entity: pimlico,
						leaks: {
							cexAccount: Leak.NEVER,
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							ref: dataLeakReferences.pimlico,
							walletAddress: Leak.ALWAYS,
						},
					},
					{
						entity: biconomy,
						leaks: {
							cexAccount: Leak.NEVER,
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							ref: dataLeakReferences.biconomy,
							walletAddress: Leak.ALWAYS,
						},
					},
					{
						entity: lifi,
						leaks: {
							cexAccount: Leak.NEVER,
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.NEVER,
							ref: dataLeakReferences.lifi,
							walletAddress: Leak.NEVER,
						},
					},
					{
						entity: github,
						leaks: {
							cexAccount: Leak.NEVER,
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.NEVER,
							ref: dataLeakReferences.github,
							walletAddress: Leak.NEVER,
						},
					},
				],
				onchain: {},
			},
			privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20(26%20November%202021).pdf',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				stealthAddresses: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,

				details: `Rewards are distributed according to the impact of the vulnerability based on the Immunefi Vulnerability Severity Classification System V2.2. This is a simplified 5-level scale, with separate scales for websites/apps and smart contracts/blockchains, encompassing everything from consequence of exploitation to privilege required to likelihood of a successful exploit.

All High and Critical Smart Contract bug reports require a PoC and a suggestion for a fix to be eligible for a reward. All Low and Medium Smart contract bug reports require a suggestion for a fix to be eligible for a reward.

The following vulnerabilities are not eligible for a reward:

https://github.com/AmbireTech/code4rena#known-tradeoffs

Payouts are handled by the Ambire team directly and are denominated in USD. However, payouts are done in ETH unless agreed otherwise.`,
				upgradePathAvailable: false,
				url: 'https://immunefi.com/bug-bounty/ambire/information/',
			},
			hardwareWalletSupport: {
				ref: {
					explanation:
						'You can natively sign transactions with Ledger, Trezor, or GridPlus Lattice1 in Ambire.',
					url: 'https://www.ambire.com/',
				},
				supportedWallets: {
					[HardwareWalletType.LEDGER]: supported({
						[HardwareWalletConnection.webUSB]: supported({
							ref: {
								explanation:
									'Ambire supports native transaction signing with Ledger hardware wallets.',
								url: 'https://www.ambire.com/',
							},
						}),
					}),
					[HardwareWalletType.TREZOR]: supported({
						[HardwareWalletConnection.webUSB]: supported({
							ref: {
								explanation:
									'Ambire supports native transaction signing with Trezor hardware wallets.',
								url: 'https://www.ambire.com/',
							},
						}),
					}),
					[HardwareWalletType.GRIDPLUS]: supported({
						[HardwareWalletConnection.webUSB]: supported({
							ref: {
								explanation:
									'Ambire supports native transaction signing with GridPlus Lattice1 hardware wallets.',
								url: 'https://www.ambire.com/',
							},
						}),
					}),
				},
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			publicSecurityAudits: v2Audits,
			scamAlerts: {
				contractTransactionWarning: notSupported,
				scamUrlWarning: supported({
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
					ref: {
						explanation:
							"Every 6 hours, Ambire downloads a list of publicly available known scam URLs from an external API. Then, it checks if the website you're connecting to is on that list. If it is, a warning is displayed.",
						lastRetrieved: '2025-04-02',
						urls: [
							{
								label: 'Implementation',
								url: 'https://github.com/AmbireTech/ambire-common/blob/v2/src/controllers/phishing/phishing.ts',
							},
						],
					},
				}),
				sendTransactionWarning: notSupported,
			},
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
		transparency: {
			feeTransparency: {
				disclosesWalletFees: true,
				level: FeeTransparencyLevel.COMPREHENSIVE,
				showsTransactionPurpose: true,
			},
		},
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
