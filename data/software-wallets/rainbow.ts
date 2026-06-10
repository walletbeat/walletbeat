import { mattmatt } from '@/data/contributors/0xmattmatt'
import { polymutex } from '@/data/contributors/polymutex'
import { alphabet } from '@/data/entities/alphabet'
import { apple } from '@/data/entities/apple'
import { rainbow as rainbowEntity } from '@/data/entities/rainbow'
import { sentry } from '@/data/entities/sentry'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { CollectionPolicy } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { GuardianPolicyType, GuardianType } from '@/schema/features/security/account-recovery'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const rainbow: SoftwareWallet = {
	metadata: {
		id: 'rainbow',
		displayName: 'Rainbow',
		tableName: 'Rainbow',
		blurb: paragraph(`
			Rainbow Extension. Built for speed. Built for power. Built for You.
		`),
		contributors: [polymutex, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2026-05-11',
		urls: {
			docs: ['https://rainbowkit.com/'],
			extensions: [
				'https://chromewebstore.google.com/detail/rainbow/opfgelmcmbiajamepnmloijbpoleiama',
			],
			repositories: [
				'https://github.com/rainbow-me/browser-extension',
				'https://github.com/rainbow-me/rainbow',
			],
			socials: {
				farcaster: 'https://farcaster.xyz/rainbow',
				x: 'https://x.com/rainbowdotme',
			},
			websites: ['https://rainbow.me'],
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
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: null,
		chainConfigurability: {
			// Source: Rainbow team responses via Walletbeat questionnaire
			[Variant.BROWSER]: supported<WithRef<ChainConfigurability>>({
				ref: refTodo,
				customChainRpcEndpoint: featureSupported,
				l1: supported({
					rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
					withNoConnectivityExceptL1RPCEndpoint: {
						accountCreation: featureSupported,
						accountImport: featureSupported,
						erc20BalanceLookup: featureSupported,
						erc20TokenSend: featureSupported,
						etherBalanceLookup: featureSupported,
					},
				}),
				nonL1: supported({
					rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
				}),
			}),
			[Variant.MOBILE]: null,
		},
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: notSupported,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Rainbow uses the GPL-3.0 license for its source code',
						label: 'Rainbow License File',
						url: 'https://github.com/rainbow-me/rainbow/blob/c26561eefb4251146db71e5b39f6f0b7233fa647/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			// Source: Rainbow team responses via Walletbeat questionnaire
			ref: [
				{
					explanation: 'Rainbow fee revenue data is publicly available on DeFiLlama.',
					url: 'https://defillama.com/protocol/fees/rainbow',
				},
				{
					explanation: 'Rainbow investor information is publicly available.',
					url: 'https://investors.rainbow.me/',
				},
				{
					explanation:
						'Rainbow raised an $18M Series A led by Seven Seven Six, following a $1.5M seed round.',
					url: 'https://techcrunch.com/2022/02/15/web3-mobile-wallet-startup-rainbow-raises-18m-series-a-from-alexis-ohanians-fund/',
				},
				{
					explanation:
						'Rainbow token has ~180M circulating of 1B total supply (~18% float) as of April 2026.',
					url: 'https://www.coingecko.com/en/coins/rainbow-3',
				},
			],
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: true, // ~180M circulating of 1B total supply (~18% float) per CoinGecko as of 2026 04 24
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: true, // Questionnaire: fees on perpetual futures and prediction markets are not explicitly displayed
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: true, // Questionnaire: swap review sheet shows fees
				ventureCapital: true, // $18M Series A led by Seven Seven Six, $1.5M seed including Y Combinator
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'Both Rainbow clients integrate Sentry for crash and error reporting. In the mobile app, `initSentry` runs in all production builds (disabled only for dev/test sessions).',
							url: 'https://github.com/rainbow-me/rainbow/blob/903d96e1075054ede51a721f5430b09c530fedf9/src/logger/sentry.ts',
						},
						{
							explanation:
								'The in-app Analytics toggle (Settings > Privacy) only disables usage analytics via `analytics.disable()`; it does not stop Sentry crash reporting.',
							url: 'https://github.com/rainbow-me/rainbow/blob/bcaa23256cdab40bea73a5bf89a232d8f13f9ac0/src/screens/SettingsSheet/components/PrivacySection.tsx',
						},
						{
							explanation:
								'In the browser extension, `initializeSentry` runs in all non-dev builds and is not gated by the analytics opt-out, so the user cannot disable crash reporting.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/566dbc30d057e007a6f05ca2694cc600683e4ae8/src/core/sentry/index.ts',
						},
						{
							explanation:
								'The in-app Privacy settings state that when the Analytics toggle is disabled, "only essential crash diagnostics are collected", confirming crash reporting cannot be turned off by the user.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-08-privacy-analytics-settings.png',
						},
					],
					entity: sentry,
					// Sentry crash reporting runs in all production builds of both clients and is
					// not gated by the in-app analytics opt-out, so users cannot disable it.
					policy: CollectionPolicy.ALWAYS,
				}),
				usage: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'The mobile app collects product usage analytics via RudderStack; analytics default to enabled and are disabled only when the `doNotTrack` device flag is set.',
							url: 'https://github.com/rainbow-me/rainbow/blob/fa6b1e08a12d964cc82f61ff657ec586dd5086e5/src/analytics/index.ts',
						},
						{
							explanation:
								'The browser extension also collects usage analytics via RudderStack, enabled by default (gated by the `analyticsDisabled` setting).',
							url: 'https://github.com/rainbow-me/browser-extension/blob/b5da91cd683f1b9cdd2eb4a43b3b8314986cf1af/src/analytics/index.ts',
						},
						{
							explanation:
								'Usage analytics can be disabled by the user via the in-app Analytics toggle (Settings > Privacy), which calls `analytics.disable()` and sets `doNotTrack`.',
							url: 'https://github.com/rainbow-me/rainbow/blob/bcaa23256cdab40bea73a5bf89a232d8f13f9ac0/src/screens/SettingsSheet/components/PrivacySection.tsx',
						},
						{
							explanation:
								'The in-app Privacy settings describe the Analytics toggle as "allowing analytics of usage data", confirming it governs usage analytics collection.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-08-privacy-analytics-settings.png',
						},
					],
					// Usage analytics is collected by Rainbow, implemented via the RudderStack
					// SDK. The data plane host is configured through a build-time environment
					// variable, so whether events also reach RudderStack as an external recipient
					// cannot be verified from the public source; collection is attributed to
					// Rainbow, the recipient we can confirm.
					entity: rainbowEntity,
					policy: CollectionPolicy.BY_DEFAULT,
				}),
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://rainbow.me/privacy',
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
				// Source: Rainbow team responses via Walletbeat questionnaire
				// Rainbow supports cloud backup (iCloud/Google Drive) but not guardian-based recovery.
				guardianRecovery: supported({
					ref: {
						explanation:
							'Rainbow encrypts the seed phrase with a user-chosen password and stores the encrypted backup in iCloud (iOS) or Google Drive (Android).',
						url: 'https://rainbow.me/support/app/restore-from-a-backup',
					},
					minimumGuardianPolicy: {
						type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
						descriptionMarkdown:
							'Rainbow encrypts the seed phrase with the user wallet password and stores it in iCloud or Google Drive. Recovery requires the backup password and access to either cloud provider.',
						optionalGuardians: [
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'iCloud account',
								entity: apple,
							},
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Google Drive account',
								entity: alphabet,
							},
						],
						optionalGuardiansMinimumConfigurable: 1,
						optionalGuardiansMinimumNeededForRecovery: 1,
						requiredGuardians: [
							{
								type: GuardianType.WALLET_PASSWORD,
							},
						],
						secretReconstitution: 'CLIENT_SIDE',
					},
				}),
			},
			bugBountyProgram: notSupported,
			duressResistance: supported({
				basicUnlock: {
					ref: refTodo,
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: true,
						[BasicUnlockMechanism.BIOMETRIC]: false,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
			}),
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},

			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [],
			scamAlerts: null, // Rainbow uses Blockaid per questionnaire, but full details on all sub-fields pending follow-up
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc7730: supported({
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
				}),
				erc8213: supported({
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
						},
					[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
						nondeterminism: 'STATIC_SINGLE_OUTCOME' as const,
					},
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				builtInErc20Swap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				erc20L1Transfer: null,
				ethL1Transfer: null,
				uniswapUSDCToEtherSwap: null,
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The browser extension build job checks out an external repository (rainbow-me/browser-extension-env) and re-runs `yarn setup` (which runs `yarn install` and `yarn ds:install`) during the build, so build inputs are fetched from the network rather than from a pre-fetched, integrity-verified input set.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/e600feb293b94aa16f7bb54aef9fa58f00c1422e/.github/workflows/build.yml',
						},
						{
							explanation:
								'The mobile wallet Android release build runs `yarn install --immutable && yarn setup` and resolves Gradle dependencies while assembling the release, fetching build inputs from the network.',
							url: 'https://github.com/rainbow-me/rainbow/blob/d79896d683cfa0ef8a8a6133057c4060acdbe63c/.github/workflows/android-play-store.yml',
						},
						{
							explanation:
								'The mobile wallet iOS build runs `yarn install --immutable && yarn setup` and `fastlane match`, which fetches signing certificates from a remote git repository during the build, fetching build inputs from the network.',
							url: 'https://github.com/rainbow-me/rainbow/blob/4782c0a9010ea5783761144fb46ef0b55f4cc572/.github/actions/ios-build/action.yaml',
						},
					],
				}),
				repositoryChangeControls: null,
				// Rainbow publishes no reproducible-build tooling, documentation, or
				// verification process, and its release builds are not hermetic (they fetch
				// inputs from the network during the build), so an independent party cannot
				// rebuild the released artifacts and confirm a bit-for-bit match.
				reproducibleBuilds: notSupported,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
