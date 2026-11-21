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
		lastUpdated: '2026-10-18',
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
				ref: {
					explanation:
						'Anon Wallet connects to web apps through the standard EIP-1193 interface, so most apps that work with MetaMask also work with Anon.',
					label: 'Anon Wallet app integration guide',
					url: 'https://docs.anon.inc/developer/dapp-integration',
				},
				'1193': featureSupported,
				'2700': null,
				'6963': null,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The wallet source code is not public. Anon plans to publish its code over time.',
						label: 'Anon security overview',
						url: 'https://docs.anon.inc/security/overview',
					},
					{
						explanation:
							'The Terms of Service give users only a limited, personal license to use the software.',
						label: 'Anon Terms of Service',
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
						'Anon charges a 0.13% fee when funds move into or out of the private balance, on top of the Railgun protocol fee.',
					label: 'Anon shielding guide',
					url: 'https://docs.anon.inc/guides/shielding',
				},
				{
					explanation: 'Anon charges a 0.30% fee on private swaps.',
					label: 'Anon swapping guide',
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
								'When you create an account, Anon creates the recovery phrase and encrypts it on your device.',
							label: 'Anon installation guide',
							url: 'https://docs.anon.inc/installation',
						},
						{
							explanation: 'Anon does not send keys or the recovery phrase to its servers.',
							label: 'Anon security overview',
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
								'The extension source code is not public, so how it stores keys and generates random numbers cannot be checked.',
							label: 'Anon Wallet on the Chrome Web Store',
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
								'The permission list comes from the Android app downloaded from this page. The app source code is not public, so how it stores keys and generates random numbers cannot be checked.',
							label: 'Anon releases page',
							url: 'https://anon.inc/releases',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.NOT_VERIFIABLE,
					mobileAppHardening: {
						android: {
							usesPermissions: [
								AndroidPermission.ACCESS_NETWORK_STATE,
								AndroidPermission.CAMERA,
								AndroidPermission.DETECT_SCREEN_CAPTURE,
								AndroidPermission.FOREGROUND_SERVICE,
								AndroidPermission.FOREGROUND_SERVICE_DATA_SYNC,
								AndroidPermission.INTERNET,
								AndroidPermission.POST_NOTIFICATIONS,
								AndroidPermission.RECEIVE_BOOT_COMPLETED,
								AndroidPermission.USE_BIOMETRIC,
								AndroidPermission.USE_FINGERPRINT,
								AndroidPermission.VIBRATE,
								AndroidPermission.WAKE_LOCK,
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
						explanation:
							'Anon publishes dated release notes for the extension and the Android app.',
						label: 'Anon releases page',
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
