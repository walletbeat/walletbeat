import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { type SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

import { certik } from '../entities/certik'
import { cure53 } from '../entities/cure53'
import trustWalletRawExtManifest from './manifests/trustWallet/egjidjbpglichdcondbcbdnbeeppgdph.manifest.json'

// Only audits of the wallet app code are listed. Trust Wallet's security page also
// lists audits of its smart contracts, a review of an external cryptography library
// and a penetration test of its token assets service. None of these covers the
// browser extension or mobile app code.
const securityAudits: SecurityAudit[] = [
	{
		ref: 'https://assets-cdn.trustwallet.com/audits/Certik-browser-extension_Feb24.pdf',
		auditDate: '2023-02-24',
		auditor: certik,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		ref: 'https://trustwallet.com/assets/files/cure53_tw_browser_extension_04.2023.pdf',
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
		contributors: [minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
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
		accountSupport: null,
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
				'1193': null,
				'2700': null,
				'6963': null,
			},
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation:
							'Trust Wallet Core, the cryptographic wallet library that is "a core part of the popular Trust Wallet", is published under the Apache 2.0 license.',
						url: 'https://github.com/trustwallet/wallet-core/blob/d40d24a63d92619167903369308bf0e2f7eb3a59/LICENSE',
					},
				],
				license: FOSSLicense.APACHE_2_0,
			},
			// No source repository exists for the mobile app or the browser extension.
			// Source: https://walletscrutiny.com/android/com.wallet.crypto.trustapp/
			walletAppLicense: {
				ref: refNotNecessary,
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						"Binance acquired Trust Wallet in July 2018, paying with a mix of cash, Binance stock and Binance's own token.",
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
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://trustwallet.com/privacy-notice',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							"Trust Wallet is part of the Binance bug bounty program on Bugcrowd. The Trust Wallet Android and iOS apps, the Chrome extension and wallet-core are in scope; the Trust Wallet websites are out of scope. Rewards for Trust Wallet targets range from $200 to $10,000 depending on severity, paid in Binance's own token.",
						url: 'https://bugcrowd.com/engagements/binance',
					},
					{
						explanation:
							'The Trust Wallet iOS app, Android app and wallet-core were added to the Binance program on 2020-07-01.',
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
								'Bugcrowd rates the Binance program "Partial safe harbor": "This engagement provides a limited goodwill statement about not pursuing legal action related to security research."',
							url: 'https://bugcrowd.com/engagements/binance',
						},
					],
				}),
				platform: BugBountyPlatform.BUG_CROWD,
				rewards: supported({
					currency: 'USD',
					maximum: 10000,
					minimum: 200,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: securityAudits,
			scamAlerts: null,
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								'Manifest collected from the Chrome Web Store listing. The extension source is not public, so key storage and RNG cannot be verified.',
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
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
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
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'WalletScrutiny: "Build cannot be done because the source code is not publicly available." The browser extension has no public source repository either.',
							url: 'https://walletscrutiny.com/android/com.wallet.crypto.trustapp/',
						},
					],
				}),
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
