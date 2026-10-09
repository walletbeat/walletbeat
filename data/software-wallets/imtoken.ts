import { mattmatt } from '@/data/contributors/0xmattmatt'
import { mako } from '@/data/contributors/mako'
import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	EntityRole,
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
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { type ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { cure53 } from '../entities/cure53'
import { imToken } from '../entities/imtoken'

export const imtoken: SoftwareWallet = {
	metadata: {
		id: 'imtoken',
		displayName: 'imToken',
		tableName: 'imToken',
		coinspectId: 'im-token',
		contributors: [mako, mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://docs.token.im/'],
			repositories: ['https://github.com/consenlabs/token-core-monorepo'],
			socials: {
				discord: 'https://discord.com/invite/imToken',
				x: 'https://x.com/imTokenOfficial',
			},
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
						walletServiceFeeDisplayUnits: null,
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
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation:
							'imToken publishes its core code under the Apache 2.0 open-source license; the app itself is proprietary.',
						url: 'https://github.com/consenlabs/token-core-monorepo/blob/9798639887b0496b562490952d8f1585047a749e/LICENSE',
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
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: {
				[Variant.MOBILE]: null,
			},
			dataCollection: {
				[UserFlow.INSTALL]: null,
				[UserFlow.NATIVE_SWAP]: {
					collected: [],
				},
				[UserFlow.SEND_ETHER]: {
					collected: [],
				},
				[UserFlow.SEND_USDC]: null,
				[UserFlow.MAKE_TRANSACTION]: {
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
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [],
				},
				[UserFlow.ONBOARDING_NEW]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_IMPORT]: null,
			},
			privacyPolicy: 'https://token.im/tos-en.html',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				drills: null,
				// Recovery is only by importing the user's own mnemonic, private key or keystore: "If you lost your mnemonic phrase and you haven't backed it up, it can't be retrieved." No cloud, social or vendor-assisted recovery is documented for the mobile app.
				// Source: https://support.token.im/hc/en-us/articles/360003123113
				guardianRecovery: notSupported,
			},
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
				dateStarted: '2024-04-15' as const,
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
			duressResistance: null,
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
			keysHandling: {
				ref: [
					{
						explanation:
							'"imToken uses the system-provided secure random source on iOS and Android to generate private keys locally"; private keys "are never transmitted over any network."',
						url: 'https://support.token.im/hc/en-us/articles/51636016918553',
					},
					{
						explanation:
							'The open-source TokenCore library generates the 12-word BIP-39 mnemonic on the device (`tiny-bip39`, seeded from the OS random source).',
						url: 'https://github.com/consenlabs/token-core-monorepo/blob/eeda742a035ca0d74664956bf715b8c4c6574ffb/token-core/tcx-primitive/src/rand.rs',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
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
								'imToken warns about risky signatures such as eth_sign, nonstandard EIP-712 type signatures, and ENS security risks including zero-width characters. It also marks risky tokens, addresses, and apps. Processing happens on-device.',
							url: 'https://support.token.im/hc/en-us/articles/21850966355737-Revamped-imToken-signature-for-safer-and-more-intuitive-transactions',
						},
					],
					leaksUserAddress: false,
					leaksUserIp: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: notSupported,
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
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
				erc20L1Transfer: supported(comprehensiveGasOrExternalFees),
				ethL1Transfer: supported(comprehensiveGasOrExternalFees),
				uniswapUSDCToEtherSwap: null,
			},*/
			orderflowPractices: null,
			releaseTransparency: {
				// App-store signing only; the Android APK SHA-256 hashes published in the help center are integrity checks, not signatures.
				artifactSigning: notSupported,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				// Only store release notes and occasional help-center articles; no complete public changelog for the app.
				hasPublicChangelog: notSupported,
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				// Only the TokenCore library is open source; the app is not: "Build cannot be done because the source code is not publicly available."
				// Source: https://walletscrutiny.com/mobile/im.token.app/
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
