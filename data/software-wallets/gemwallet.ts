import { h3rman } from '@/data/contributors/0xh3rman'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { UnlimitedApprovalWarning } from '@/schema/features/security/scam-alerts'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
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
import { type References, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseMobileManifestJson } from '@/tools/manifest-collector/mobile-manifest-parser'
import type { Nullable } from '@/types/utils/nullable'

import { certik } from '../entities/certik'
import gemwalletAndroidParsed from './manifests/gemwallet/android.parsed.json'
import gemwalletIosParsed from './manifests/gemwallet/ios.parsed.json'

const securityAudits: SecurityAudit[] = [
	{
		ref: {
			explanation:
				'CertiK performed a security audit of Gem Wallet covering key management, transaction signing, seed handling, and address derivation. The report lists 0 critical and 0 major findings, 6 medium-severity findings, and 5 minor findings, all resolved.',
			label: 'Gem Wallet CertiK Security Audit (April 2026)',
			url: 'https://static.gemwallet.com/audits/Gem-Wallet-CertiK-Security-Audit-April-2026.pdf',
		},
		auditDate: '2026-04-08',
		auditor: certik,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: 'ALL_VARIANTS',
	},
]

const bugBountyRefs: References = [
	{
		explanation:
			'Gem Wallet launched a self-hosted bug bounty program on November 12, 2025, covering the iOS and Android apps, open-source repositories, and backend infrastructure, with rewards from $100 to $8,000 based on severity.',
		label: 'Gem Wallet Launches Bug Bounty Program',
		url: 'https://gemwallet.com/learn/gem-wallet-launches-bug-bounty-program/',
	},
	{
		explanation:
			'As of June 2, 2026, Gem Wallet no longer operates a standing monetary bug bounty program; private/responsible vulnerability disclosure remains open for good-faith, reproducible reports, with in-scope targets being the latest iOS/Android apps, the Gem Wallet monorepo, and gemwallet.com/api.gemwallet.com/gemnodes.com. No Safe Harbor or other explicit legal-protection language is provided, only a requirement that testing be conducted in good faith.',
		label: 'Gem Wallet no longer runs a standing bug bounty program',
		lastRetrieved: '2026-09-03',
		url: 'https://gemwallet.com/security/bug-bounty/',
	},
]

export const gemwallet: SoftwareWallet = {
	metadata: {
		id: 'gemwallet',
		displayName: 'Gem Wallet',
		tableName: 'Gem Wallet',
		coinspectId: 'gem',
		contributors: [h3rman],
		iconExtension: 'svg',
		lastUpdated: '2025-10-14',
		urls: {
			androidManifestXml:
				'https://raw.githubusercontent.com/gemwalletcom/wallet/main/android/app/src/raw/AndroidManifest.xml',
			docs: ['https://docs.gemwallet.com/'],
			iosInfoPlist:
				'https://raw.githubusercontent.com/gemwalletcom/wallet/main/ios/Gem/Resources/Info.plist',
			repositories: ['https://github.com/gemwalletcom/wallet'],
			socials: {
				discord: 'https://discord.com/invite/4jpxtwT8r6',
				instagram: 'https://www.instagram.com/GemWalletApp/',
				reddit: 'https://www.reddit.com/r/gemwallet_official/',
				telegram: 'https://t.me/gemwallet',
				x: 'https://x.com/gemwallet',
				youtube: 'https://www.youtube.com/@gemwallet',
			},
			websites: ['https://gemwallet.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: [
					{
						explanation:
							"Gem Wallet's shared Rust core generates a BIP-39 mnemonic locally (entropy from the OS CSPRNG via the `getrandom` crate) and derives account private keys using BIP-44 (BIP-32-style secp256k1 derivation for EVM chains).",
						label:
							'Mnemonic generation (`Mnemonic::generate`) and BIP-44 derivation (`derive_private_key_from_mnemonic`)',
						urls: [
							{
								label: 'gem_keystore mnemonic generation',
								url: 'https://github.com/gemwalletcom/wallet/blob/d597d9bcc391be24cb5be2e7afaee0e5276a9ec5/core/crates/gem_keystore/src/mnemonic.rs#L10-L14',
							},
							{
								label: 'gem_derivation BIP-44 private key derivation',
								url: 'https://github.com/gemwalletcom/wallet/blob/21ba20473238ae31d5406edbf2533a08d7c80878/core/crates/gem_derivation/src/mnemonic/derivation.rs#L39-L58',
							},
						],
					},
				],
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
						'Gem Wallet supports sending to ENS addresses, but users need to verify which chain they are using.',
					url: 'https://gemwallet.com',
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
		chainAbstraction: null,
		chainConfigurability: supported<WithRef<Nullable<ChainConfigurability>>>({
			ref: [
				{
					explanation:
						'Gem Wallet lets users switch between a set of built-in RPC providers or add a fully custom RPC endpoint per chain, from Settings > Network, before making any further requests on that chain.',
					label: 'Setup a Custom RPC on Gem Wallet',
					lastRetrieved: '2026-09-03',
					url: 'https://docs.gemwallet.com/guides/custom-rpc/',
				},
				{
					file: 'public/references/wallets/gemwallet/screenshots/2026-09-04-rpc-configureable.jpg',
					label: 'Gem wallet allows configureable RPC.',
				},
			],
			customChainRpcEndpoint: featureSupported,
			l1: null,
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
			}),
		}),
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Gem Wallet is licensed under the GPL-3.0 license.',
						url: 'https://github.com/gemwalletcom/gem-ios/blob/ef264f54eacacacba837735ac6ed605c9512f84a/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Gem Wallet publishes transparent revenue data on Dune Analytics, showing all revenue sources and breakdowns.',
					url: 'https://dune.com/gemwallet/gem-wallet',
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
				transparentConvenienceFees: true,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: notSupportedWithRef({
					ref: [
						{
							explanation:
								'No crash-reporting SDK (e.g. Crashlytics, Sentry) was found in the iOS or Android codebases. The Google Play build flavor bundles Firebase only for push notifications (FCM), with Firebase Performance Monitoring explicitly deactivated via manifest meta-data.',
							label:
								'No crash-reporting SDK; Firebase Performance explicitly disabled in AndroidManifest.xml',
							url: 'https://github.com/gemwalletcom/wallet/blob/03438ef394e821847b41346137b8f6650579df13/android/app/src/google/AndroidManifest.xml#L29-L31',
						},
					],
				}),
				usage: notSupportedWithRef({
					ref: [
						{
							explanation:
								'No product-analytics SDK (e.g. Amplitude, Mixpanel, PostHog) was found in the iOS or Android codebases. The Google Play build flavor bundles Firebase only for push notifications (FCM), with Firebase Analytics and ad-ID collection explicitly deactivated via manifest meta-data.',
							label:
								'No product-analytics SDK; Firebase Analytics/ad-ID explicitly disabled in AndroidManifest.xml',
							url: 'https://github.com/gemwalletcom/wallet/blob/03438ef394e821847b41346137b8f6650579df13/android/app/src/google/AndroidManifest.xml#L29-L31',
						},
					],
				}),
			},
			appIsolation: {type:'APP_CONNECTION_NOT_SUPPORTED'},
			dataCollection: null,
			privacyPolicy: 'https://gemwallet.com/privacy',
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
				drills: notSupported,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: bugBountyRefs,
				availability: BugBountyProgramAvailability.INACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2025-11-12',
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								"On iOS, unlocking the wallet's keystore password stored in the Keychain is gated behind Face ID/Touch ID or the device passcode. On Android, the equivalent Tink-encrypted secret store is gated behind BiometricPrompt.",
							urls: [
								{
									label: 'iOS keystore password gated by biometrics/device passcode',
									url: 'https://github.com/gemwalletcom/wallet/blob/2458aaee288cb428e3ecc01a7beec66b3c4673ed/ios/Packages/GemstoneServices/Sources/Keystore/LocalKeystorePassword.swift#L104',
								},
								{
									label: 'Android BiometricPrompt authenticators (biometric or device credential)',
									url: 'https://github.com/gemwalletcom/wallet/blob/5225ec8834ee5ff33ffe64a7b9c9b1c3ff026762/android/app/src/main/kotlin/com/gemwallet/android/SystemAuthPolicy.kt#L18-L19',
								},
							],
						},

						{
							explanation:
								'Face ID / biometric app-lock is documented as a Settings > Security toggle.',
							label: 'How to Configure Your Gem Wallet Settings',
							lastRetrieved: '2026-09-03',
							url: 'https://docs.gemwallet.com/guides/configure-settings/',
						},
						{
							file: 'public/references/wallets/gemwallet/screenshots/2026-09-04-security-face-id.jpg',
							label:
								"Gem Wallet's mobile app shows Face ID as a security lock but no pin or passwords.",
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: false,
						[BasicUnlockMechanism.BIOMETRIC]: true,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
			},
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'Ledger and Trezor hardware wallet integration is listed as a "Coming Soon" item on Gem Wallet\'s public roadmaps.',
						label: 'Gem Wallet security page (hardware wallet roadmap) and public roadmap',
						lastRetrieved: '2026-09-03',
						urls: [
							{ label: 'Security page', url: 'https://gemwallet.com/security/' },
							{
								label: 'Public roadmap',
								url: 'https://github.com/orgs/gemwalletcom/projects/4',
							},
						],
					},
				],
				wallets: {},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							"Gem Wallet's shared Rust core generates the BIP-39 mnemonic entropy locally via the OS CSPRNG (`getrandom` crate) with no server involvement, and the full private key/mnemonic is held and used entirely on the user's device (standard BIP-32/44 derivation, no key splitting or MPC).",
						urls: [
							{
								label: 'Local entropy generation via OS CSPRNG',
								url: 'https://github.com/gemwalletcom/wallet/blob/21ba20473238ae31d5406edbf2533a08d7c80878/core/crates/gem_crypto/src/random.rs',
							},
							{
								label: 'Mnemonic generated on-device from that entropy',
								url: 'https://github.com/gemwalletcom/wallet/blob/d597d9bcc391be24cb5be2e7afaee0e5276a9ec5/core/crates/gem_keystore/src/mnemonic.rs#L10-L14',
							},
						],
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: securityAudits,
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet uses GoPlus and HashDit for security detection, providing malicious contract detection and transaction analysis.',
							url: 'https://gemwallet.com',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: false,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet warns users about outgoing transactions to unknown addresses.',
							url: 'https://gemwallet.com',
						},
					],
					addressPoisoningDetection: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
				unlimitedApprovalWarning: supported<UnlimitedApprovalWarning>({
					ref: [
						{
							explanation:
								'Gem Wallet\'s simulation engine detects ERC-20 `approve` calls whose amount equals the max uint160/uint256 value and displays the approval value as "Unlimited" (rather than an exact amount) as part of a transaction warning, purely from local calldata decoding.',
							urls: [
								{
									label: 'Unlimited approval detection',
									url: 'https://github.com/gemwalletcom/wallet/blob/c8721ea2ea2d612a71acd8d4a243815751e6a860/core/crates/simulation/src/evm/approval_value.rs#L8-L34',
								},
								{
									label: 'Approval simulation warning built from the decoded value',
									url: 'https://github.com/gemwalletcom/wallet/blob/a51a29c1015ffa9af3896c313aebd65ee63ece52/core/crates/simulation/src/evm/approval_request.rs#L143-L160',
								},
							],
						},
					],
					leaksSpenderAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					warnsOnUnlimitedApproval: true,
				}),
			},
			securityBestPractices: {
				browser: 'NOT_A_BROWSER_EXTENSION',
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								"Gem Wallet's shared Rust core (`gem_keystore` v4) encrypts each wallet's mnemonic/private key with AES-256-GCM under a key derived via Argon2id from a 256-bit random per-device password, using a random salt/nonce per encryption and an authenticated file format.",
								label: 'Argon2id key derivation and AES-256-GCM seal/open',
								url: 'https://github.com/gemwalletcom/wallet/blob/21ba20473238ae31d5406edbf2533a08d7c80878/core/crates/gem_keystore/src/storage/crypto.rs#L1-L26',
						},
						{
							explanation:
								'The 256-bit device password that seals the keystore file is itself generated with `SecureRandom` and stored via Tink, wrapped by an AES-256-GCM key held in the Android Keystore. On iOS, the equivalent device secret is stored in the system Keychain.',
							urls: [
								{
									label: 'Random 256-bit device password generation',
									url: 'https://github.com/gemwalletcom/wallet/blob/34fdd5958f97b860b75789513c6869ee8c8fe8d0/android/app/src/main/kotlin/com/gemwallet/android/data/password/TinkPasswordStore.kt#L26-L52',
								},
								{
									label: 'Tink AEAD keyset wrapped by an Android Keystore master key',
									url: 'https://github.com/gemwalletcom/wallet/blob/eaf09d562edaee530d0d12b5214d1125031ea656/android/app/src/main/kotlin/com/gemwallet/android/data/password/TinkEncryptedKeyValueStore.kt#L60-L91',
								},
								{
									label: 'iOS Keychain-backed device secret storage',
									url: 'https://github.com/gemwalletcom/wallet/blob/2458aaee288cb428e3ecc01a7beec66b3c4673ed/ios/Packages/GemstoneServices/Sources/Keystore/LocalKeystorePassword.swift#L100-L106',
								},
							],
						},
						{
							explanation:
								'Entropy for mnemonic/salt generation is drawn from the OS CSPRNG via the `getrandom` crate.',
							url: 'https://github.com/gemwalletcom/wallet/blob/21ba20473238ae31d5406edbf2533a08d7c80878/core/crates/gem_crypto/src/random.rs',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: parseMobileManifestJson(gemwalletAndroidParsed, gemwalletIosParsed),
					secureRng: SecureRngSource.OS_CSPRNG,
				},
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: [
						{
							explanation:
								'Every chain client (including the EVM broadcast path) is built from a single per-chain endpoint URL supplied by the platform-side `AlienProvider.get_endpoint(chain)`, the same endpoint Gem Wallet lets users override with a fully custom RPC node from Settings > Network. There is no separate relay/bundler path for transaction broadcast: `eth_sendRawTransaction` goes out over that same client.',
							url: {
								label: 'EVM transaction broadcast goes through that same client',
								url: 'https://github.com/gemwalletcom/wallet/blob/61971f542acbe85caabea6363fb84e4a612cf701/core/crates/gem_evm/src/provider/transaction_broadcast.rs#L20-L26',
							},
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: [
						{
							explanation:
								'Both Arbitrum and OP Stack chains are supported chains with their own EVM provider wiring, but no force-inclusion. Yransactions can only be submitted through the configured RPC endpoint.',
							urls: [
								{
									label: 'Arbitrum, Optimism, Base among the supported EVM chains',
									url: 'https://github.com/gemwalletcom/wallet/blob/a226cade5f681218649cf75bbe26be07c3977329/core/crates/primitives/src/chain_evm.rs#L21-L23',
								},
							],
						},
					],
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: null,
				}),
				erc20L1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyLocking: supported<WithRef<{}>>({
					ref: [
						{
							explanation:
								'Gradle dependency locking is enabled for the Android build (committed `settings-gradle.lockfile`); the Rust core commits a `Cargo.lock`. Each Swift Package commits a `Package.resolved`, resolved by CI via `just spm-resolve` before building.',
							urls: [
								{
									label: 'Android Gradle settings lockfile',
									url: 'https://github.com/gemwalletcom/wallet/blob/03438ef394e821847b41346137b8f6650579df13/android/settings-gradle.lockfile',
								},
								{
									label: 'Rust core Cargo.lock',
									url: 'https://github.com/gemwalletcom/wallet/blob/d88663d1e12e4f15b041bf36a00ef9bb89a2293b/core/Cargo.lock',
								},
								{
									label: 'iOS SPM Package.resolved (example package)',
									url: 'https://github.com/gemwalletcom/wallet/blob/d705e619cc493eeba850d0eb5eaf7ddded043937/ios/Packages/Validators/Package.resolved',
								},
							],
						},
					],
				}),
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: supported({
					ref: 'https://github.com/gemwalletcom/wallet/releases',
				}),
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
