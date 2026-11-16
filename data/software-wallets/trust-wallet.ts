import { minimalsm } from '@/data/contributors/minimalsm'
import { amplitude } from '@/data/entities/amplitude'
import { sentry } from '@/data/entities/sentry'
import type { SoftwareWallet } from '@/data/software-wallets'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType } from '@/schema/features/account-support'
import { CollectionPolicy } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
} from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { type SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	BuiltInSwapDefaultApprovalBehavior,
	SpendingApprovalsControl,
} from '@/schema/features/self-sovereignty/permissions-management'
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
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

import { mattmatt } from '../contributors/0xmattmatt'
import { certik } from '../entities/certik'
import { cure53 } from '../entities/cure53'
import trustWalletRawExtManifest from './manifests/trustWallet/egjidjbpglichdcondbcbdnbeeppgdph.manifest.json'

// Trust Wallet's smart contract and library audits don't cover the app or extension code.
const securityAudits: SecurityAudit[] = [
	{
		ref: {
			label: 'CertiK audit of the Trust Wallet browser extension',
			url: 'https://assets-cdn.trustwallet.com/audits/Certik-browser-extension_Feb24.pdf',
		},
		auditDate: '2023-02-24',
		auditor: certik,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		ref: {
			label: 'Cure53 audit of the Trust Wallet browser extension',
			url: 'https://trustwallet.com/assets/files/cure53_tw_browser_extension_04.2023.pdf',
		},
		auditDate: '2023-04-20',
		auditor: cure53,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
]

export const trustWallet: SoftwareWallet = {
	metadata: {
		id: 'trust-wallet',
		displayName: 'Trust Wallet',
		tableName: 'Trust Wallet',
		coinspectId: 'trust-wallet',
		contributors: [minimalsm, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2026-11-16',
		urls: {
			docs: ['https://developer.trustwallet.com/developer'],
			extensions: [
				'https://chromewebstore.google.com/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
			],
			repositories: ['https://github.com/trustwallet/wallet-core'],
			socials: {
				facebook: 'https://facebook.com/trustweb3',
				instagram: 'https://instagram.com/trustwallet',
				linkedin: 'https://www.linkedin.com/company/trustwallet',
				reddit: 'https://reddit.com/r/trustapp',
				telegram: 'https://t.me/trustwallet',
				x: 'https://x.com/TrustWallet',
				youtube: 'https://www.youtube.com/@Trustwallet',
			},
			websites: ['https://trustwallet.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				ref: [
					{
						explanation:
							'FlexGas uses EIP-7702 to let an EOA act as a smart account for a transaction, so that gas can be paid in TWT, USDT or USDC. It is opt-in.',
						label: 'Trust Wallet FlexGas announcement',
						url: 'https://trustwallet.com/blog/company/flex-gas-pay-for-gas-with-twt-usdt-or-bnb',
					},
				],
				contract: 'UNKNOWN',
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							'The recovery phrase can be shown from the wallet settings. Private key export is hidden by default and must first be turned on in the developer settings.',
						label: 'Trust Wallet guide to recovery phrase backup and private key export',
						url: 'https://trustwallet.com/blog/guides/how-to-backup-your-recovery-phrase-and-export-private-keys-in-trust-wallet',
					},
					{
						explanation:
							"Trust Wallet Core derives Ethereum accounts from a BIP39 mnemonic with the standard BIP44 path m/44'/60'/0'/0/0.",
						label: 'Trust Wallet Core registry entry for Ethereum',
						url: 'https://github.com/trustwallet/wallet-core/blob/d40d24a63d92619167903369308bf0e2f7eb3a59/registry.json#L481-L493',
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
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
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
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation: 'Trust Wallet Core is published under the Apache License 2.0.',
						label: 'Trust Wallet Core license',
						url: 'https://github.com/trustwallet/wallet-core/blob/d40d24a63d92619167903369308bf0e2f7eb3a59/LICENSE#L1-L3',
					},
					{
						explanation:
							'Trust Wallet Core is an open-source library that forms a core part of Trust Wallet.',
						label: 'Trust Wallet Core README',
						url: 'https://github.com/trustwallet/wallet-core/blob/d40d24a63d92619167903369308bf0e2f7eb3a59/README.md#L3-L5',
					},
				],
				license: FOSSLicense.APACHE_2_0,
			},
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The source code of the Trust Wallet Android and iPhone apps is not public.',
						label: 'WalletScrutiny review of the Trust Wallet Android app',
						url: 'https://walletscrutiny.com/android/com.wallet.crypto.trustapp/',
					},
					{
						label: 'WalletScrutiny review of the Trust Wallet iPhone app',
						url: 'https://walletscrutiny.com/iphone/com.sixdays.trust/',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						"Binance acquired Trust Wallet in July 2018, paying with a mix of cash, Binance stock and Binance's own token.",
					label: 'TechCrunch report on the Binance acquisition',
					url: 'https://techcrunch.com/2018/07/31/crypto-exchange-binance-buys-trust-wallet-in-first-acquisition-deal',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: {
					[Variant.BROWSER]: supported<WalletAnalytics>({
						ref: refTodo,
						entity: sentry,
						policy: CollectionPolicy.BY_DEFAULT,
					}),
					[Variant.MOBILE]: null,
				},
				usage: {
					[Variant.BROWSER]: supported<WalletAnalytics>({
						ref: refTodo,
						entity: amplitude,
						policy: CollectionPolicy.BY_DEFAULT,
					}),
					[Variant.MOBILE]: null,
				},
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://trustwallet.com/privacy-notice',
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
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							"Trust Wallet's apps, browser extension and wallet-core are covered by Binance's bug bounty on Bugcrowd.",
						label: 'Binance bug bounty program on Bugcrowd',
						url: 'https://bugcrowd.com/engagements/binance',
					},
					{
						explanation:
							'The Trust Wallet apps and wallet-core joined the Binance program on 2020-07-01.',
						label: 'Binance bug bounty announcements on Bugcrowd',
						url: 'https://bugcrowd.com/engagements/binance/announcements',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: nonEmptySet(CoverageBreadth.APP_ONLY),
				dateStarted: '2020-07-01' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.LEGAL_ASSURANCE,
					ref: [
						{
							explanation:
								'Bugcrowd marks the Binance program as "Partial safe harbor", a limited promise not to take legal action over security research.',
							label: 'Binance bug bounty program on Bugcrowd',
							url: 'https://bugcrowd.com/engagements/binance',
						},
					],
				}),
				platform: BugBountyPlatform.BUG_CROWD,
				rewards: supported({
					currency: 'USD',
					maximum: 100000,
					minimum: 200,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: {
				[Variant.BROWSER]: null,
				[Variant.MOBILE]: {
					basicUnlock: {
						ref: [
							{
								explanation:
									'App Lock is a toggle in the security settings. It locks the app with a 6-digit passcode, and Face ID can be added as a lock method.',
								label: 'Trust Wallet support article on setting up a security PIN',
								url: 'https://support.trustwallet.com/en/support/solutions/articles/67000734571-setting-up-or-resetting-a-security-pin-on-trust-wallet',
							},
						],
						mechanisms: {
							[BasicUnlockMechanism.PIN]: supported({
								type: BasicUnlockMechanismSupport.OPTIONAL,
							}),
							[BasicUnlockMechanism.PASSWORD]: notSupported,
							[BasicUnlockMechanism.BIOMETRIC]: supported({
								type: BasicUnlockMechanismSupport.OPTIONAL,
							}),
							[BasicUnlockMechanism.PATTERN]: notSupported,
						},
					},
					duressMode: notSupported,
				},
			},
			hardwareWalletSupport: {
				[Variant.BROWSER]: {
					ref: [
						{
							explanation:
								'The browser extension supports Ledger devices connected by USB. Ledger support is not available in the mobile app.',
							label: 'Trust Wallet guide to using the extension with a Ledger',
							url: 'https://community.trustwallet.com/t/how-to-use-the-trust-wallet-browser-extension-with-a-ledger-hardware-wallet/680725',
						},
						{
							label: 'Trust Wallet Ledger FAQ',
							url: 'https://community.trustwallet.com/t/using-trust-wallet-with-your-ledger-hardware-wallet-frequently-asked-questions-faq/680818',
						},
					],
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.webHID],
						}),
					},
				},
				[Variant.MOBILE]: {
					ref: [
						{
							explanation: 'Ledger support is only available in the browser extension.',
							label: 'Trust Wallet Ledger FAQ',
							url: 'https://community.trustwallet.com/t/using-trust-wallet-with-your-ledger-hardware-wallet-frequently-asked-questions-faq/680818',
						},
					],
					wallets: {},
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Trust Wallet "generates a secret recovery phrase on your device". The phrase and the private keys derived from it never leave the phone or browser extension, and are never stored on Trust Wallet servers.',
						label: 'Trust Wallet article on wallet safety',
						url: 'https://trustwallet.com/blog/security/is-trust-wallet-safe',
					},
					{
						explanation:
							'Trust Wallet Core creates a wallet by generating one complete BIP39 mnemonic locally. No key shares are involved.',
						label: 'Trust Wallet Core mnemonic generation',
						url: 'https://github.com/trustwallet/wallet-core/blob/d40d24a63d92619167903369308bf0e2f7eb3a59/src/HDWallet.cpp#L64-L75',
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
			scamAlerts: null,
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								'The extension source code is not public, so how it stores keys and generates random numbers cannot be checked.',
							label: 'Trust Wallet on the Chrome Web Store',
							url: 'https://chromewebstore.google.com/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
						},
					],
					browserExtensionHardening: parseBrowserExtensionManifest(trustWalletRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.NOT_VERIFIABLE,
					secureRng: SecureRngSource.NOT_VERIFIABLE,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'SOURCE_NOT_AVAILABLE',
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							'The Approvals tab lists ERC-20 token approvals with the spender and the approved amount, including unlimited approvals.',
						file: 'public/references/wallets/trust-wallet/screenshots/2026-11-16-trust-wallet-erc20-approvals.png',
						label: 'Trust Wallet Approvals tab',
					},
				],
				approvalsManagement: supported({
					erc1155Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
				}),
				builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT,
			},
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
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
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'WalletScrutiny cannot rebuild the Trust Wallet mobile apps because their source code is not public.',
							label: 'WalletScrutiny review of the Trust Wallet Android app',
							url: 'https://walletscrutiny.com/android/com.wallet.crypto.trustapp/',
						},
						{
							label: 'WalletScrutiny review of the Trust Wallet iPhone app',
							url: 'https://walletscrutiny.com/iphone/com.sixdays.trust/',
						},
					],
				}),
			},
		},
		walletCall: {
			[Variant.BROWSER]: notSupported,
			[Variant.MOBILE]: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
