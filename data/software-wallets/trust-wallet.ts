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
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

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
		contributors: [minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-18',
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
				hiddenReferralCodes: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				transparentReferralCodes: null,
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
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
