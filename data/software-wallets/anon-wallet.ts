import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	AndroidPermission,
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'

import anonWalletRawExtManifest from './manifests/anonWallet/gnkbgepgknkbhnnbaihklcfkjhbclajk.manifest.json'

export const anonWallet: SoftwareWallet = {
	metadata: {
		id: 'anon-wallet',
		displayName: 'Anon Wallet',
		tableName: 'Anon',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://docs.anon.inc'],
			extensions: [
				'https://chromewebstore.google.com/detail/anon-wallet-private-evm-w/gnkbgepgknkbhnnbaihklcfkjhbclajk',
			],
			playstore: 'https://play.google.com/store/apps/details?id=com.ahloop.anon',
			socials: {
				discord: 'https://discord.gg/jjUvWyYjKA',
				x: 'https://x.com/anondotinc',
			},
			websites: ['https://anon.inc'],
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
				ref: [
					{
						explanation: 'Anon Wallet injects a standard EIP-1193 provider into web pages.',
						url: 'https://docs.anon.inc/developer/dapp-integration',
					},
					{
						explanation:
							'The published extension package announces itself to web apps as Anon Wallet through EIP-6963 provider discovery events.',
						url: 'https://chromewebstore.google.com/detail/anon-wallet-private-evm-w/gnkbgepgknkbhnnbaihklcfkjhbclajk',
					},
				],
				'1193': featureSupported,
				'2700': null,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The wallet source code is not published yet. Anon states that it plans to publish its repositories progressively.',
						url: 'https://docs.anon.inc/security/overview',
					},
					{
						explanation:
							'The Terms of Service grant a limited, personal, revocable, nonexclusive, nontransferable license to use the software.',
						url: 'https://anon.inc/tos',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Shielding costs the 0.25% Railgun protocol fee plus a 0.13% fee charged by Anon, both listed in the docs.',
					url: 'https://docs.anon.inc/guides/shielding',
				},
				{
					explanation:
						'Private swaps carry a documented 0.30% Anon swap fee, in addition to the fees for moving funds out of and back into the private balance.',
					url: 'https://docs.anon.inc/guides/swapping',
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
				transparentConvenienceFees: true,
				ventureCapital: null,
			},
		},
		multiAddress: {
			[Variant.BROWSER]: featureSupported,
			[Variant.MOBILE]: null,
		},
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://anon.inc/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: {
				[Variant.BROWSER]: {
					ref: [
						{
							explanation:
								'The 12-word mnemonic is created in the extension and stored in the browser, encrypted with AES-256-GCM.',
							url: 'https://docs.anon.inc/concepts/key-management',
						},
						{
							explanation:
								'The docs state that no key material, mnemonic, or note contents are sent to the wallet servers.',
							url: 'https://docs.anon.inc/security/overview',
						},
					],
					keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
					multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
				},
				[Variant.MOBILE]: null,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								'The extension is published on the Chrome Web Store, so its manifest is public. The extension source code is not published, so key storage and RNG cannot be verified.',
							url: 'https://chromewebstore.google.com/detail/anon-wallet-private-evm-w/gnkbgepgknkbhnnbaihklcfkjhbclajk',
						},
					],
					browserExtensionHardening: parseBrowserExtensionManifest(anonWalletRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.NOT_VERIFIABLE,
					secureRng: SecureRngSource.NOT_VERIFIABLE,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'Permissions come from the manifest of the published Android app, version 1.3.6 (build 10306). The download hash matches the one listed on the releases page, and the package is signed by Ahloop. The app source code is not published, so key storage and RNG cannot be verified.',
							url: 'https://anon.inc/releases',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.NOT_VERIFIABLE,
					mobileAppHardening: {
						// The APK also declares FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, WAKE_LOCK,
						// RECEIVE_BOOT_COMPLETED and the AndroidX DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION,
						// which AndroidPermission cannot represent yet (#1602).
						android: {
							usesPermissions: [
								AndroidPermission.ACCESS_NETWORK_STATE,
								AndroidPermission.CAMERA,
								AndroidPermission.DETECT_SCREEN_CAPTURE,
								AndroidPermission.INTERNET,
								AndroidPermission.POST_NOTIFICATIONS,
								AndroidPermission.USE_BIOMETRIC,
								AndroidPermission.USE_FINGERPRINT,
								AndroidPermission.VIBRATE,
							],
						},
						ios: 'NOT_AN_IOS_APP',
					},
					secureRng: SecureRngSource.NOT_VERIFIABLE,
				},
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
				hasPublicChangelog: supported({
					ref: {
						explanation: 'Dated release notes for each extension and Android version.',
						url: 'https://anon.inc/releases',
					},
				}),
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.BROWSER]: true,
		[Variant.MOBILE]: true,
	},
}
