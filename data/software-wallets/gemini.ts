import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { trailofbits } from '@/data/entities/trail-of-bits'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import {
	Leak,
	LeakedPersonalInfo,
	LeakedWalletInfo,
	MultiAddressPolicy,
	RegularEndpoint,
} from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { gelato } from '../entities/gelato'
import { geminiAccountContract } from '../wallet-contracts/gemini-account'

export const gemini: SoftwareWallet = {
	metadata: {
		id: 'gemini',
		displayName: 'Gemini Wallet',
		tableName: 'Gemini Wallet',
		blurb: paragraph(`
			Gemini Wallet is a self-custody smart contract wallet using
			passkey authentication and ERC-7579 modular account standard.
			It eliminates seed phrases and provides cross-chain functionality
			with hardware-bound, end-to-end encrypted access.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-08-25',
		pseudonymType: {
			plural: 'Gemini usernames',
			singular: 'Gemini username',
		},
		repoUrl: null,
		url: 'https://keys.gemini.com/',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				contract: geminiAccountContract,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					explanation:
						'Gemini Wallet uses ERC-7579 modular account standard with passkey authentication and supports key management through the wallet interface',
					url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
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
				medium: 'OFFCHAIN',
				offchainDataVerifiability: 'VERIFIABLE',
				offchainProviderConnection: 'DIRECT_CONNECTION',
			}),
			ref: [
				{
					explanation:
						'Gemini Wallet provides each user with a free ENS subdomain and supports ENS resolution.',
					url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
				},
			],
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					feesLargerThan1bps: 'VISIBLE_BY_DEFAULT',
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: supported({
					feesLargerThan1bps: 'VISIBLE_BY_DEFAULT',
					risksExplained: 'NOT_IN_UI',
				}),
			},
			crossChainBalances: {
				ether: {
					crossChainSumView: supported({
						ref: {
							explanation:
								'Gemini Wallet provides cross-chain balance aggregation across supported networks',
							url: 'https://onchain.gemini.com/',
						},
					}),
					perChainBalanceViewAcrossMultipleChains: supported({
						ref: {
							explanation: 'Users can view balances across multiple supported chains',
							url: 'https://onchain.gemini.com/',
						},
					}),
				},
				globalAccountValue: supported({
					ref: {
						explanation: 'Wallet provides global account value across all supported chains',
						url: 'https://onchain.gemini.com/',
					},
				}),
				perChainAccountValue: supported({
					ref: {
						explanation: 'Wallet shows per-chain account values',
						url: 'https://onchain.gemini.com/',
					},
				}),
				usdc: {
					crossChainSumView: supported({
						ref: {
							explanation: 'Cross-chain USDC balance aggregation is supported',
							url: 'https://onchain.gemini.com/',
						},
					}),
					perChainBalanceViewAcrossMultipleChains: supported({
						ref: {
							explanation: 'USDC balances can be viewed across supported chains',
							url: 'https://onchain.gemini.com/',
						},
					}),
				},
			},
		},
		chainConfigurability: {
			customChains: false,
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
		},
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				'1193': supported({
					ref: {
						explanation:
							'Gemini Wallet provides a EIP-1193 compatible provider through @gemini-wallet/core SDK',
						url: 'https://www.npmjs.com/package/@gemini-wallet/core',
					},
				}),
				'2700': supported({
					ref: {
						explanation:
							'Gemini Wallet provides a EIP-2700 compatible provider through @gemini-wallet/core SDK',
						url: 'https://www.npmjs.com/package/@gemini-wallet/core',
					},
				}),
				'6963': notSupported,
			},
			walletCall: supported({
				atomicMultiTransactions: supported({
					ref: {
						explanation:
							'Gemini Wallet supports atomic multi-transactions through @gemini-wallet/core SDK',
						url: 'https://www.npmjs.com/package/@gemini-wallet/core',
					},
				}),
				ref: {
					explanation: 'Gemini Wallet supports basic wallet call functionality through its SDK',
					url: 'https://www.npmjs.com/package/@gemini-wallet/core',
				},
			}),
		},
		license: {
			license: License.MIT,
			ref: [
				{
					explanation: 'Gemini Wallet SDK is licensed under the MIT license.',
					url: 'https://www.gemini.com/blog/why-gemini-wallet-looks-the-way-it-does',
				},
			],
		},
		monetization: {
			ref: [
				{
					explanation:
						'Gemini Wallet is developed by Gemini Trust Company, LLC, a regulated cryptocurrency exchange.',
					url: 'https://www.gemini.com/',
				},
			],
			revenueBreakdownIsPublic: true,
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
			dataCollection: {
				collectedByEntities: [
					{
						entity: gelato,
						leaks: {
							[LeakedPersonalInfo.IP_ADDRESS]: Leak.NEVER,
							[LeakedWalletInfo.MEMPOOL_TRANSACTIONS]: Leak.NEVER,
							[LeakedWalletInfo.WALLET_ADDRESS]: Leak.ALWAYS,
							endpoint: RegularEndpoint,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							ref: {
								explanation: 'Gemini Wallet uses Gelato for transaction bundling',
								url: 'https://www.npmjs.com/package/@gemini-wallet/core',
							},
						},
					},
				],
				onchain: {
					[LeakedPersonalInfo.PSEUDONYM]: Leak.ALWAYS,
					ref: {
						explanation:
							'Creating a Gemini Wallet registers a free ENS subdomain (.gemini.eth) linking the username to the wallet address.',
						url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
					},
				},
			},
			privacyPolicy: 'https://www.gemini.com/privacy-policy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {
					[HardwareWalletType.OTHER]: supported({
						[HardwareWalletConnection.bluetooth]: featureSupported,
						[HardwareWalletConnection.QR]: featureSupported,
						[HardwareWalletConnection.USB]: featureSupported,
					}),
				},
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				details:
					'Gemini Wallet uses ZeroDev infrastructure for secure passkey (WebAuthn) authentication with hardware-bound, end-to-end encrypted access.',
				library: PasskeyVerificationLibrary.ZERO_DEV,
				libraryUrl: 'https://github.com/zerodevapp/kernel',
				ref: [
					{
						explanation:
							'Gemini Wallet uses passkey authentication to eliminate the need for seed phrases while providing secure access.',
						url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
					},
				],
			},
			publicSecurityAudits: [
				{
					auditDate: '2025-08-15',
					auditor: trailofbits,
					ref: 'https://github.com/coinbase/smart-wallet/blob/main/audits/Cantina-April-2024.pdf',
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					contractRegistry: true,
					leaksContractAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					previousContractInteractionWarning: true,
					recentContractWarning: true,
					ref: {
						explanation:
							'Gemini Wallet includes Blockaid integration for end-to-end onchain security and transaction risk scanning.',
						url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
					},
				}),
				scamUrlWarning: supported({
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: supported({
					leaksRecipient: true,
					leaksUserAddress: true,
					leaksUserIp: false,
					newRecipientWarning: true,
					ref: [
						{
							explanation:
								'Gemini Wallet provides transaction risk scanning through Blockaid integration before transaction signing.',
							url: 'https://www.gemini.com/blog/launching-the-gemini-wallet-a-simple-and-secure-way-to-go-onchain',
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
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
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
	overrides: {
		attributes: {
			privacy: {
				addressCorrelation: {
					note: paragraph(`
						Gemini Wallet provides each user with a free ENS subdomain
						(.gemini.eth) during signup. Users can choose their own
						subdomain name, and for privacy purposes, it is recommended
						to select a name that is not linked to other identities
						to maintain pseudonymous wallet usage.
					`),
				},
			},
		},
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
