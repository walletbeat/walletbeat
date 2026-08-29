import { ren2140 } from '@/data/contributors/ren2140'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { uniswapCalibur } from '../wallet-contracts/uniswap-calibur'
import {
	RpcEndpointConfiguration,
	type ChainConfigurability,
} from '@/schema/features/self-sovereignty/chain-configurability'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { parseMobileManifestJson } from '@/tools/manifest-collector/mobile-manifest-parser'
import uniswapAndroidParsed from './manifests/uniswapWallet/android.parsed.json'
import uniswapIosParsed from './manifests/uniswapWallet/ios.parsed.json'
import uniswapRawExtManifest from './manifests/uniswapWallet/nnpmfplkfogfpmcngplhnbdnnilmcdcg.manifest.json'

export const uniswapWallet: SoftwareWallet = {
	metadata: {
		id: 'uniswap-wallet',
		displayName: 'Uniswap Wallet',
		tableName: 'Uniswap',
		coinspectId: 'uniswap',
		contributors: [ren2140],
		iconExtension: 'svg',
		lastUpdated: '2026-04-04',
		urls: {
			docs: ['https://docs.uniswap.org/'],
			extensions: [
				'https://chromewebstore.google.com/detail/uniswap-extension/nnpmfplkfogfpmcngplhnbdnnilmcdcg',
			],
			repositories: ['https://github.com/Uniswap/interface'],
			socials: {
				discord: 'https://discord.com/invite/uniswap',
				farcaster: 'https://farcaster.xyz/uniswap',
				x: 'https://x.com/Uniswap',
			},
			websites: ['https://wallet.uniswap.org/'],
			iosInfoPlist:
				'https://raw.githubusercontent.com/Uniswap/interface/main/apps/mobile/ios/Uniswap/Info.plist',
			androidManifestXml:
				'https://raw.githubusercontent.com/Uniswap/interface/main/apps/mobile/android/app/src/main/AndroidManifest.xml',
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				ref: {
					explanation:
						'Uniswap smart wallet uses the Calibur implementation with EIP-7702 delegation across supported networks.',
					url: 'https://developers.uniswap.org/docs/protocols/smart-wallet/overview',
				},
				contract: uniswapCalibur,
			}),
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: false,
				canExportSeedPhrase: true,
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
			// uniswap/packages/uniswap/src/data/apiClients/unitagsApi/useUnitagsUsernameQuery.ts
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'OFFCHAIN',
				offchainDataVerifiability: 'VERIFIABLE',
				offchainProviderConnection: 'DIRECT_CONNECTION',
			}),
		},
		chainAbstraction: null,
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: refTodo,
			customChainRpcEndpoint: notSupported,
			l1: notSupported,
			nonL1: notSupported,
		}),
		ecosystem: {
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					nonDelegationTransactionDetailsIdenticalToNormalFlow: false,
				}),
				fee: {
					crossChainGas: featureSupported,
					walletSponsored: notSupported,
				},
			},
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation:
						'The Uniswap Wallet mobile app is explicitly licensed under GPL 3.0 or later. The browser extension directory in the same monorepo does not contain a `LICENSE` file. Development happens in a private repository and only production-ready code is published.',
					url: 'https://github.com/Uniswap/interface/blob/64ff3de5ac6c4840ca6b32947b3529aea49930cc/apps/mobile/LICENSE',
				},
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Uniswap Labs raised $165M in a Series B led by Polychain Capital in October 2022, with participation from a16z, Paradigm, SV Angel, and Variant, at a $1.66B valuation. Total funding across all rounds is approximately $176M.',
					url: 'https://techcrunch.com/2022/10/13/uniswap-labs-raises-165-million-in-new-funding/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: true,
				hiddenConvenienceFees: null,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: true,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy:
				'https://support.uniswap.org/hc/en-us/articles/30934457771405-Uniswap-Labs-Privacy-Policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported({
				ref: [
					{
						explanation:
							'Uniswap Labs runs a bug bounty program through Cantina. The wallet mobile app and browser extension are in scope, with rewards up to $50K for critical wallet vulnerabilities.',
						url: 'https://cantina.xyz/bounties/f9df94db-c7b1-434b-bb06-d1360abdd1be',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE' as const,
				dateStarted: '2024-11-26' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.CANTINA,
				rewards: supported({
					currency: 'USD',
					maximum: 50000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: {
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								"The extension derives the mnemonic-encryption key from the user's password via PBKDF2 (Web Crypto's deriveKey, 100,000 iterations, SHA-256) — a standardized KDF — then encrypts the mnemonic with AES-GCM. The code itself notes this should eventually move to Argon2.",
							url: 'https://github.com/Uniswap/interface/blob/da6d36f71c4d2fd665b0aae1a052a4ffda917b31/packages/wallet/src/features/wallet/Keyring/crypto.ts#L100-L118',
						},
					],
					browserExtensionHardening: parseBrowserExtensionManifest(uniswapRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'On Android, mnemonics are stored in EncryptedSharedPreferences backed by an Android Keystore hardware master key (AES-256) — not a user-password-derived KDF. iOS mirrors this by storing mnemonics directly in the native Keychain (hardware-backed Secure Enclave). Mnemonic generation on both platforms delegates to a native Rust FFI function whose entropy source is not vendored as readable source in this repository.',
							url: 'https://github.com/Uniswap/interface/blob/da6d36f71c4d2fd665b0aae1a052a4ffda917b31/apps/mobile/android/app/src/main/java/com/uniswap/RnEthersRs.kt#L24-L34',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: parseMobileManifestJson(uniswapAndroidParsed, uniswapIosParsed),
					secureRng: SecureRngSource.LIBRARY_RNG,
				},
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
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
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: refTodo,
			atomicMultiTransactions: notSupported,
		}),
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
