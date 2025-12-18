import { mattmatt } from '@/data/contributors/0xmattmatt'
import { mako } from '@/data/contributors/mako'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	MultiAddressPolicy,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { type ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

import { cure53 } from '../entities/cure53'
import { imToken } from '../entities/imtoken'

export const imtoken: SoftwareWallet = {
	metadata: {
		id: 'imtoken',
		displayName: 'imToken',
		tableName: 'imToken',
		blurb: paragraph(`
			imToken is a reliable and intuitive digital wallet, enabling easy access to over 50+ major networks including Bitcoin, Ethereum, and Tron. imToken supports hardware wallets, token swap and DApp browser etc., and provides secure and trusted non-custodial wallet services to millions of users in more than 150 countries and regions around the world.
		`),
		contributors: [mako, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-10-28',
		urls: {
			repositories: ['https://github.com/consenlabs/token-core-monorepo'],
			websites: ['https://token.im'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: notSupported,
		},
		addressResolution: {
			ref: [
				{
					explanation:
						'imToken supports ENS human-readable names and resolves them onchain before sending funds.',
					url: 'https://support.token.im/hc/articles/360039928813',
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
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: [
						{
							explanation:
								'imToken provides built-in cross-chain bridging through cBridge and other bridge protocols, with clear fee breakdown. Scam risks are explained, but trust assumptions of the bridge are not.',
							url: 'https://support.token.im/hc/en-us/articles/4404355206553-How-to-use-cBridge-with-imToken',
						},
					],
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo,
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
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation:
						'imToken allows users to set custom RPC endpoints for any EVM network before sending requests to the default ones.',
					url: 'https://support.token.im/hc/en-us/articles/900005324266-imToken-now-supports-custom-RPC-Experience-the-layer-2-ecosystem-today',
				},
			],
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST,
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST,
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
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation:
							'imToken publishes its core code under the Apache 2.0 open-source license; the app itself is proprietary.',
						url: 'https://github.com/consenlabs/token-core-monorepo/blob/main/LICENSE',
					},
				],
				license: FOSSLicense.APACHE_2_0,
			},
			walletAppLicense: {
				[Variant.MOBILE]: {
					ref: refNotNecessary,
					license: SourceNotAvailableLicense.PROPRIETARY,
				},
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'imToken announced a USD 30 million Series B funding round led by institutional investors.',
					url: 'https://support.token.im/hc/en-us/articles/900005414706-imToken-Announces-US-30-million-Series-B-Investment',
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
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: true,
			},
		},
		multiAddress: supported({
			ref: [
				{
					explanation: 'Each request only involves one active address.',
				},
			],
		}),
		privacy: {
			appIsolation: {
				[Variant.MOBILE]: null,
			},
			dataCollection: {
				[UserFlow.NATIVE_SWAP]: {
					collected: [],
				},
				[UserFlow.SEND]: {
					collected: [],
				},
				[UserFlow.TRANSACTION]: {
					collected: [
						{
							ref: [
								{
									explanation:
										"imToken can associate your wallet address along with your mobile device's IP address, per its privacy policy. Each request only involves one active address.",
									url: 'https://token.im/tos-en.html',
								},
							],
							byEntity: imToken,
							dataCollection: {
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
							},
							purposes: [DataCollectionPurpose.CHAIN_DATA_LOOKUP],
						},
					],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [],
				},
				[UserFlow.ONBOARDING]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
			},
			privacyPolicy: 'https://token.im/tos-en.html',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'To show our appreciation to researchers, who help keep our products and our customers safe, we are glad to introduce a Responsible Disclosure Program to provide recognition and rewards for responsibly disclosed vulnerabilities.',
						url: 'https://bugrap.io/bounties/imToken%20Wallet',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2024-04-15' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: supported({
					currency: 'USDC',
					maximum: 10000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			hardwareWalletSupport: {
				[Variant.MOBILE]: {
					ref: [
						{
							explanation:
								'imToken works with the imKey hardware wallet via Bluetooth, and with Keystone via QR codes.',
							url: 'https://support.token.im/hc/en-us/articles/25985632007193-imToken-and-Hardware-Wallets-Uncompromised-Protection-Unparalleled-Convenience',
						},
					],
					wallets: {
						[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.QR],
						}),
						[HardwareWalletType.IMKEY]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.bluetooth],
						}),
					},
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation:
								'imToken underwent security audit by Cure53 in 2018. Since then, imToken has maintained internal audits for each release.',
							url: 'https://cure53.de/pentest-report_imtoken.pdf',
						},
					],
					auditDate: '2018-05-07',
					auditor: cure53,
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'imToken displays detailed contract interaction information including token quantity changes, authorization details (approve and permit), and warns when transferring funds to contract addresses or authorizing ordinary accounts. It also alerts users about high slippage during token swapping.',
							url: 'https://support.token.im/hc/en-us/articles/21850966355737-Revamped-imToken-signature-for-safer-and-more-intuitive-transactions',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: true,
					recentContractWarning: false,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation:
								'imToken warns about risky signatures such as eth_sign, non-standard EIP-712 type signatures, and ENS security risks including zero-width characters. It also marks risky tokens, addresses, and DApps. Processing happens on-device.',
							url: 'https://support.token.im/hc/en-us/articles/21850966355737-Revamped-imToken-signature-for-safer-and-more-intuitive-transactions',
						},
					],
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: notSupported,
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
				},
			},
		},
		transparency: {
			operationFees: null,
			/* TODO: Fill in; partial data: {
				builtInErc20Swap: null,
				erc20L1Transfer: supported(comprehensiveFeesShownByDefault),
				ethL1Transfer: supported(comprehensiveFeesShownByDefault),
				uniswapUSDCToEtherSwap: null,
			},*/
		},
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
