import { Leak, MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import type { Wallet } from '@/schema/wallet'
import { License } from '@/schema/features/license'
import { daimoInc } from '../entities/daimo'
import { binance } from '../entities/binance'
import { openExchangeRates } from '../entities/open-exchange-rates'
import { polymutex } from '../contributors/polymutex'
import { paragraph } from '@/types/content'
import { merkleManufactory } from '../entities/merkle-manufactory'
import { pimlico } from '../entities/pimlico'
import { honeycomb } from '../entities/honeycomb'
import { WalletProfile } from '@/schema/features/profile'
import { RpcEndpointConfiguration } from '@/schema/features/chain-configurability'
import { veridise } from '../entities/veridise'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'

export const daimo: Wallet = {
	metadata: {
		id: 'daimo',
		displayName: 'Daimo',
		tableName: 'Daimo',
		iconExtension: 'svg',
		blurb: paragraph(`
			Daimo aims to replicate a Venmo-like experience onchain.
			It focuses on cheap stablecoin payments and fast onramp and
			offramp of USD / USDC with minimal fees.
		`),
		pseudonymType: {
			singular: 'Daimo username',
			plural: 'Daimo usernames',
		},
		url: 'https://daimo.com',
		repoUrl: 'https://github.com/daimo-eth/daimo',
		contributors: [polymutex],
		lastUpdated: '2024-12-15',
	},
	features: {
		profile: WalletProfile.PAYMENTS,
		chainConfigurability: {
			l1RpcEndpoint: RpcEndpointConfiguration.NEVER_USED,
			otherRpcEndpoints: RpcEndpointConfiguration.NO,
			customChains: false,
		},
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eoa: notSupported,
			mpc: notSupported,
			eip7702: notSupported,
			rawErc4337: supported({
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					url: 'https://github.com/daimo-eth/daimo/blob/master/apps/daimo-mobile/src/view/screen/keyRotation/AddKeySlotButton.tsx',
					explanation:
						'Key rotation changes are supported in the UI and result in onchain transactions with a well-known structure',
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
			ref: [
				{
					url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/packages/daimo-api/src/network/viemClient.ts#L128',
					explanation:
						'Daimo resolves plain ENS addresses by querying the ENS Universal Resolver Contract on L1 using the Viem library.',
				},
			],
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		security: {
			scamAlerts: {
				scamUrlWarning: notSupported,
				contractTransactionWarning: notSupported,
				sendTransactionWarning: supported({
					newRecipientWarning: true,
					userWhitelist: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					ref: [
						{
							url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/apps/daimo-mobile/src/view/screen/send/SendTransferScreen.tsx#L234-L238',
							explanation:
								'Daimo shows a warning when sending funds to a user that you have not sent funds to in the past.',
						},
					],
				}),
			},
			// Note: Daimo has had their p256 verifier contract audited:
			// https://github.com/daimo-eth/p256-verifier/blob/master/audits/2023-10-veridise.pdf
			// However while the wallet relies on it, it is not the wallet software itself,
			// so it is not a full-stack audit of the wallet software.
			publicSecurityAudits: [
				{
					auditor: veridise,
					auditDate: '2023-10-06',
					ref: 'https://github.com/daimo-eth/daimo/blob/master/audits/2023-10-veridise-daimo.pdf',
					variantsScope: { mobile: true },
					codeSnapshot: {
						date: '2023-09-12',
						commit: 'f0dc56d68852c1488461e88a506ff7b0f027f245',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
			],
			lightClient: {
				ethereumL1: notSupported,
			},
		},
		privacy: {
			dataCollection: {
				onchain: {
					pseudonym: Leak.ALWAYS,
					ref: {
						explanation:
							"Creating a Daimo wallet creates a transaction publicly registering your name and address in Daimo's nameRegistry contract on Ethereum.",
						url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/contract/nameRegistry.ts#L183-L197',
					},
				},
				collectedByEntities: [
					{
						entity: daimoInc,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							mempoolTransactions: Leak.ALWAYS,
							pseudonym: Leak.ALWAYS,
							ref: {
								explanation:
									'Wallet operations are routed through Daimo.com servers without proxying.',
								url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/viemClient.ts#L35-L50',
							},
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
							ref: {
								explanation:
									'Sending bundled transactions uses the Pimlico API via api.pimlico.io as Paymaster.',
								url: [
									'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/bundlerClient.ts#L131-L133',
								],
							},
						},
					},
					{
						entity: honeycomb,
						leaks: {
							ipAddress: Leak.ALWAYS,
							walletAddress: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							pseudonym: Leak.ALWAYS,
							ref: {
								explanation:
									'Daimo records telemetry events to Honeycomb. This data includes your Daimo username. Since this username is also linked to your wallet address onchain, Honeycomb can associate the username they receive with your wallet address.',
								url: [
									'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/server/telemetry.ts#L101-L111',
								],
							},
						},
					},
					{
						entity: daimoInc,
						leaks: {
							farcasterAccount: Leak.OPT_IN,
							ref: [
								{
									explanation:
										'Users may opt to link their Farcaster profile to their Daimo profile.',
									url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/apps/daimo-mobile/src/view/sheet/FarcasterBottomSheet.tsx#L141-L148',
								},
							],
						},
					},
					{
						entity: binance,
						leaks: {
							ipAddress: Leak.OPT_IN,
							walletAddress: Leak.OPT_IN,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							cexAccount: Leak.OPT_IN,
							ref: [
								{
									explanation:
										"Users may deposit from Binance Pay, after which Binance will learn the user's wallet address.",
									url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/network/binanceClient.ts#L132',
								},
							],
						},
					},
					{
						entity: openExchangeRates,
						leaks: {
							ipAddress: Leak.ALWAYS,
							ref: [
								{
									explanation:
										'The wallet refreshes fiat currency exchange rates periodically. Such requests do not carry wallet identifying information.',
									url: [
										'https://github.com/daimo-eth/daimo/blob/072e57d700ba8d2e932165a12c2741c31938f1c2/packages/daimo-api/src/api/getExchangeRates.ts',
										'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/.env.example#L6',
									],
								},
							],
						},
					},
					{
						entity: merkleManufactory,
						leaks: {
							ipAddress: Leak.OPT_IN,
							ref: [
								{
									explanation:
										'Users may opt to link their Farcaster profile to their Daimo profile.',
									url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/apps/daimo-mobile/src/view/sheet/FarcasterBottomSheet.tsx#L141-L148',
								},
							],
						},
					},
				],
			},
			privacyPolicy: 'https://daimo.com/privacy',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					arbitrum: TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					opStack: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		license: License.GPL_3_0,
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: false,
				donations: false,
				ecosystemGrants: true,
				publicOffering: false,
				ventureCapital: true,
				transparentConvenienceFees: false,
				hiddenConvenienceFees: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
			},
			ref: [
				{
					explanation: 'Daimo is funded by venture capital.',
					url: 'https://www.crunchbase.com/funding_round/daimo-seed--8722ae6a',
				},
				{
					explanation: 'Daimo has received grant funding from the Ethereum Foundation.',
					url: 'https://blog.ethereum.org/2024/02/20/esp-allocation-q423',
				},
				{
					explanation:
						'Daimo has received grant funding from Optimism RetroPGF Round 3 for its P256Verifier contract.',
					url: 'https://vote.optimism.io/retropgf/3/application/0x118a000851cf4c736497bab89993418517ac7cd9c8ede074aff408a8e0f84060',
				},
			],
		},
	},
	overrides: {
		attributes: {
			privacy: {
				addressCorrelation: {
					note: paragraph(`
						Daimo usernames are user-selected during signup, and can be set
						to any pseudonym. Daimo provides functionality to randomize its
						value. To preserve privacy, it is recommended to pick a random
						value that is not related to any of your existing usernames.
						Doing so effectively preserves the pseudonymous nature of wallet
						addresses.
					`),
				},
			},
		},
	},
	variants: {
		mobile: true,
		browser: false,
		desktop: false,
		embedded: false,
	},
}
