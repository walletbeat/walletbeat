import { greekfetacheese } from '@/data/contributors/greekfetacheese'
import { AccountType } from '@/schema/features/account-support'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	DataDisplayOptions,
	MessageSigningDetails,
	type SoftwareMessageSigningLegibility,
	type SoftwareTransactionLegibilityImplementation,
} from '@/schema/features/security/transaction-legibility'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	comprehensiveFeesShownByDefault,
	FeeDisplayLevel,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const zeus: SoftwareWallet = {
	metadata: {
		id: 'zeus',
		displayName: 'Zeus',
		tableName: 'Zeus',
		blurb: paragraph(`
			Zeus is a truly seedless and decentralized self-custodial Ethereum wallet.
		`),
		contributors: [greekfetacheese],
		iconExtension: 'svg',
		lastUpdated: '2026-01-12',
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
				ref: refTodo,
				contract: 'UNKNOWN',
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							'Zeus derives an Hierarchical Deterministic Wallet from a username and password using the BIP32 standard. Users can also import wallets using either a 12-24 word phrase or a private key.',
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
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: [
						{
							explanation:
								'Zeus has a built-in interface which uses the Across protocol to bridge ETH between chains.',
							url: 'https://github.com/greekfetacheese/zeus/blob/master/src/gui/ui/dapps/across.rs',
						},
					],
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.AGGREGATED,
						byDefault: FeeDisplayLevel.AGGREGATED,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
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
		chainConfigurability: supported({
			ref: [
				{
					explanation:
						'Zeus uses public RPC endpoints by default but allows users to provide custom endpoints and disable or delete what they don`t want.',
					url: 'https://github.com/greekfetacheese/zeus#features',
				},
			],
			customChainRpcEndpoint: supported({
				ref: [
					{
						explanation: 'Users can use their own RPC endpoints.',
						url: 'https://github.com/greekfetacheese/zeus#features',
					},
				],
			}),
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
			browser: 'NOT_A_BROWSER_WALLET',
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Zeus is licensed under the MIT license.',
						url: 'https://github.com/greekfetacheese/zeus/blob/main/LICENSE-MIT',
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
			appIsolation: {
				[Variant.DESKTOP]: {
					createInAppConnectionFlow: notSupported,
					erc7846WalletConnect: notSupported,
					ethAccounts: supported({
						ref: [
							{
								explanation: 'Zeus exposes the address of the active account only.',
								url: 'https://github.com/greekfetacheese/zeus/blob/master/src/server.rs#L367',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupported,
				},
				[Variant.MOBILE]: null,
				[Variant.BROWSER]: null,
			},
			dataCollection: null,
			privacyPolicy: null,
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
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
				],
				guardianRecovery: notSupported,
			}),
			bugBountyProgram: notSupported,
			hardwareWalletSupport: null,
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
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Zeus currently does not have a scam alert mechanism, It simply shows with which contract you are interacting with. If it is a known contract a hyperlink with the contract`s name is shown otherwise a truncated version of the contract address is shown (hyperlink). The user can also see all the decoded events to inspect the transaction.',
							label: 'Contract interaction is shown in the transaction details',
							url: 'https://github.com/greekfetacheese/zeus/blob/master/src/gui/ui/tx_window.rs#L246C1-L247C1',
						},
					],
					contractRegistry: true,
					leaksContractAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					previousContractInteractionWarning: false,
					recentContractWarning: false,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					ref: [
						{
							label: 'Before every transaction the user must confirm the action.',
							url: 'https://github.com/greekfetacheese/zeus/blob/master/src/utils/tx.rs#L241C1-L242C1',
						},
					],
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					userWhitelist: true,
				}),
			},
			transactionLegibility: supported({
				ref: [
					{
						explanation:
							'Zeus performs local EVM simulations to verify and display exact transaction outcomes, including decoding of common events like erc20 transfers, swaps, approvals etc...',
						url: 'https://github.com/greekfetacheese/zeus/blob/master/src/core/tx_analysis.rs',
					},
				],
				calldataDisplay: null,
				messageSigningLegibility: {
					[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
					[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
					[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
					[MessageSigningDetails.SAFE_HASH]: DataDisplayOptions.NOT_IN_UI,
				} as SoftwareMessageSigningLegibility,
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.NOT_IN_UI,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
			} as SoftwareTransactionLegibilityImplementation),
		},
		selfSovereignty: {
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
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
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
					],
					afterSingleAction: comprehensiveFeesShownByDefault.afterSingleAction,
					byDefault: comprehensiveFeesShownByDefault.byDefault,
					fullySponsored: comprehensiveFeesShownByDefault.fullySponsored,
				}),
				erc20L1Transfer: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show the exact tokens the recipient will receive in case of a token tax but it does not breakdown the fees if any.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: comprehensiveFeesShownByDefault.afterSingleAction,
					byDefault: comprehensiveFeesShownByDefault.byDefault,
					fullySponsored: comprehensiveFeesShownByDefault.fullySponsored,
				}),
				ethL1Transfer: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show exact outcomes including fees.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: comprehensiveFeesShownByDefault.afterSingleAction,
					byDefault: comprehensiveFeesShownByDefault.byDefault,
					fullySponsored: comprehensiveFeesShownByDefault.fullySponsored,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: [
						{
							explanation:
								'Zeus performs local EVM simulations to show exact outcomes but it does not show the fees if any.',
							url: 'https://github.com/greekfetacheese/zeus#features',
						},
					],
					afterSingleAction: comprehensiveFeesShownByDefault.afterSingleAction,
					byDefault: comprehensiveFeesShownByDefault.byDefault,
					fullySponsored: comprehensiveFeesShownByDefault.fullySponsored,
				}),
			},
		},
	},
	variants: {
		[Variant.DESKTOP]: true,
	},
}
