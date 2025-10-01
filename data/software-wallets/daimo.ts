import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	Leak,
	LeakedPersonalInfo,
	LeakedWalletInfo,
	MultiAddressPolicy,
	RegularEndpoint,
} from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { binance } from '../entities/binance'
import { daimoInc } from '../entities/daimo'
import { honeycomb } from '../entities/honeycomb'
import { merkleManufactory } from '../entities/merkle-manufactory'
import { openExchangeRates } from '../entities/open-exchange-rates'
import { pimlico } from '../entities/pimlico'
import { veridise } from '../entities/veridise'

export const daimo: SoftwareWallet = {
	metadata: {
		id: 'daimo',
		displayName: 'Daimo',
		tableName: 'Daimo',
		blurb: paragraph(`
			Daimo aims to replicate a Venmo-like experience onchain.
			It focuses on cheap stablecoin payments and fast onramp and
			offramp of USD / USDC with minimal fees.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		pseudonymType: {
			plural: 'Daimo usernames',
			singular: 'Daimo username',
		},
		repoUrl: 'https://github.com/daimo-eth/daimo',
		url: 'https://daimo.com',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					explanation:
						'Key rotation changes are supported in the UI and result in onchain transactions with a well-known structure',
					url: 'https://github.com/daimo-eth/daimo/blob/master/apps/daimo-mobile/src/view/screen/keyRotation/AddKeySlotButton.tsx',
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
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
			ref: [
				{
					explanation:
						'Daimo resolves plain ENS addresses by querying the ENS Universal Resolver Contract on L1 using the Viem library.',
					url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/packages/daimo-api/src/network/viemClient.ts#L128',
				},
			],
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					feesLargerThan1bps: 'VISIBLE_BY_DEFAULT',
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: notSupported,
				},
				globalAccountValue: notSupported,
				perChainAccountValue: notSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: notSupported,
				},
			},
		},
		chainConfigurability: {
			customChains: false,
			l1RpcEndpoint: RpcEndpointConfiguration.NEVER_USED,
			otherRpcEndpoints: RpcEndpointConfiguration.NO,
		},
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
			walletCall: notSupported,
		},
		license: {
			license: License.GPL_3_0,
			ref: [
				{
					explanation: 'Daimo is licensed under the GPL-3.0 license.',
					url: 'https://github.com/daimo-eth/daimo/blob/master/LICENSE',
				},
			],
		},
		monetization: {
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
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: false,
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			dataCollection: {
				collectedByEntities: [
					{
						entity: daimoInc,
						leaks: {
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.ALWAYS,
							[LeakedWalletInfo.MEMPOOL_TRANSACTIONS]: Leak.ALWAYS,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.ALWAYS,
							[LeakedPersonalInfo.PSEUDONYM]: Leak.ALWAYS,
							endpoint: RegularEndpoint,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
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
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.ALWAYS,
							[LeakedWalletInfo.MEMPOOL_TRANSACTIONS]: Leak.ALWAYS,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.ALWAYS,
							endpoint: RegularEndpoint,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
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
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.ALWAYS,
							[LeakedPersonalInfo.PSEUDONYM]: Leak.ALWAYS,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.ALWAYS,
							endpoint: RegularEndpoint,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
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
						entity: binance,
						leaks: {
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.OPT_IN,
							[LeakedPersonalInfo.CEX_ACCOUNT]: Leak.OPT_IN,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.OPT_IN,
							endpoint: RegularEndpoint,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
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
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.ALWAYS,
							endpoint: RegularEndpoint,
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
						entity: daimoInc,
						leaks: {
							endpoint: RegularEndpoint,
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.OPT_IN,
							[LeakedPersonalInfo.FARCASTER_ACCOUNT]: Leak.OPT_IN,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.OPT_IN,
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
						entity: merkleManufactory,
						leaks: {
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.OPT_IN,
							[LeakedPersonalInfo.FARCASTER_ACCOUNT]: Leak.OPT_IN,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.OPT_IN,
							endpoint: RegularEndpoint,
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
				onchain: {
					[LeakedPersonalInfo.PSEUDONYM]: Leak.ALWAYS,
					ref: {
						explanation:
							"Creating a Daimo wallet creates a transaction publicly registering your name and address in Daimo's nameRegistry contract on Ethereum.",
						url: 'https://github.com/daimo-eth/daimo/blob/e1ddce7c37959d5cec92b05608ce62f93f3316b7/packages/daimo-api/src/contract/nameRegistry.ts#L183-L197',
					},
				},
			},
			privacyPolicy: 'https://daimo.com/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
			},
		},
		profile: WalletProfile.PAYMENTS,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {},
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: {
				details:
					'Daimo uses a verifier based on FreshCryptoLib for passkey verification in their P256Verifier contract.',
				library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
				libraryUrl: 'https://github.com/daimo-eth/p256-verifier/blob/master/src/P256Verifier.sol',
				ref: [
					{
						explanation:
							'Daimo implements P256 verification using a verifier based on FreshCryptoLib in their P256Verifier contract.',
						url: 'https://github.com/daimo-eth/p256-verifier/blob/master/src/P256Verifier.sol',
					},
				],
			},
			publicSecurityAudits: [
				{
					auditDate: '2023-10-06',
					auditor: veridise,
					codeSnapshot: {
						commit: 'f0dc56d68852c1488461e88a506ff7b0f027f245',
						date: '2023-09-12',
					},
					ref: 'https://github.com/daimo-eth/daimo/blob/master/audits/2023-10-veridise-daimo.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.MOBILE]: true },
				},
			],
			scamAlerts: {
				contractTransactionWarning: notSupported,
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					ref: [
						{
							explanation:
								'Daimo shows a warning when sending funds to a user that you have not sent funds to in the past.',
							url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/apps/daimo-mobile/src/view/screen/send/SendTransferScreen.tsx#L234-L238',
						},
					],
					userWhitelist: false,
				}),
			},
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			feeTransparency: null,
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
		[Variant.MOBILE]: true,
	},
}
