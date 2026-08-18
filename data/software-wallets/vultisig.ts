import { realpaaao } from '@/data/contributors/realpaaao'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceAvailableNonFOSSLicense,
} from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'

export const vultisig: SoftwareWallet = {
	metadata: {
		id: 'vultisig',
		displayName: 'Vultisig',
		tableName: 'Vultisig',
		blurb: paragraph(`
			Vultisig is a free, open-source, multi-chain wallet without a seed phrase.
			Each vault is created as a set of key shares held on the user's own devices,
			and transactions are signed with MPC threshold signatures rather than by
			reassembling a single private key.
		`),
		contributors: [realpaaao],
		iconExtension: 'svg',
		lastUpdated: '2026-08-05',
		urls: {
			appstore: 'https://apps.apple.com/app/apple-store/id6503023896',
			docs: ['https://docs.vultisig.com'],
			extensions: [
				'https://chromewebstore.google.com/detail/vultisig-extension/ggafhcdaplkhmmnlbfjpnnkepdfjaelb',
			],
			playstore: 'https://play.google.com/store/apps/details?id=com.vultisig.wallet',
			repositories: ['https://github.com/vultisig'],
			socials: {
				x: 'https://x.com/vultisig',
			},
			websites: ['https://vultisig.com'],
		},
	},
	features: {
		// Vultisig accounts are MPC accounts, but `AccountSupport` also requires a
		// verdict on EIP-7702, ERC-4337 and Safe support, none of which have been
		// verified yet. The MPC key model is recorded under `security.keysHandling`.
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
						explanation:
							'The Vultisig extension injects a provider at `window.vultisig` and announces itself over EIP-6963 with the reverse DNS identifier `me.vultisig`.',
						url: 'https://github.com/vultisig/vultisig-windows/blob/7746d2eca7994a09d11d22c559c2a332c6f8a975/clients/extension/src/inpage/utils/windowInjector.ts',
					},
					{
						explanation:
							'The Vultisig extension integration guide documents EIP-1193 provider compliance and EIP-6963 provider announcement. It does not document EIP-2700, which is therefore left unrated.',
						url: 'https://github.com/vultisig/vultisig-windows/blob/7746d2eca7994a09d11d22c559c2a332c6f8a975/clients/extension/docs/integration-guide.md',
					},
				],
				'1193': featureSupported,
				'2700': null,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation:
							"Vultisig's DKLS23 threshold signature implementation is published under Silence Laboratories' Non-Commercial Use License. The source is available, but the license is not OSI-approved.",
						url: 'https://github.com/vultisig/dkls23-rs/blob/5ab4e7f8c0fd99f3bd76c9a4da90becce447d52c/LICENSE',
					},
					{
						explanation:
							'The Vultisig Android application links against a prebuilt DKLS library rather than building the signing core from the application repository.',
						url: 'https://github.com/vultisig/vultisig-android/blob/2d3633eb5c891d16de668512503ea7067de73b5b/app/build.gradle.kts',
					},
				],
				license: SourceAvailableNonFOSSLicense.PROPRIETARY_SOURCE_AVAILABLE,
			},
			walletAppLicense: {
				[Variant.BROWSER]: {
					ref: [
						{
							explanation:
								'The Vultisig browser extension lives in the vultisig-windows repository, which is licensed under Apache 2.0.',
							url: 'https://github.com/vultisig/vultisig-windows/blob/7746d2eca7994a09d11d22c559c2a332c6f8a975/LICENSE',
						},
					],
					license: FOSSLicense.APACHE_2_0,
				},
				[Variant.DESKTOP]: {
					ref: [
						{
							explanation:
								'The Vultisig desktop application for Windows, macOS, and Linux is licensed under Apache 2.0.',
							url: 'https://github.com/vultisig/vultisig-windows/blob/7746d2eca7994a09d11d22c559c2a332c6f8a975/LICENSE',
						},
					],
					license: FOSSLicense.APACHE_2_0,
				},
				[Variant.MOBILE]: {
					ref: [
						{
							explanation:
								'The Vultisig iOS and Android applications are both licensed under Apache 2.0.',
							url: [
								'https://github.com/vultisig/vultisig-ios/blob/f5e2061207b2afd4f5083480f75aef9060b09db9/LICENSE',
								'https://github.com/vultisig/vultisig-android/blob/2d3633eb5c891d16de668512503ea7067de73b5b/LICENSE',
							],
						},
					],
					license: FOSSLicense.APACHE_2_0,
				},
			},
		},
		monetization: {
			ref: refTodo,
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
			privacyPolicy: 'https://vultisig.com/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Vultisig vaults are created through a distributed key generation ceremony between the participating devices using DKLS23, a threshold signature protocol by Silence Laboratories. No device ever holds a complete private key, and there is no seed phrase.',
						url: 'https://docs.vultisig.com',
					},
					{
						explanation:
							'The DKLS23 protocol implementation used by Vultisig is published by Silence Laboratories.',
						url: 'https://github.com/silence-laboratories/dkls23/blob/9074cd9905a38cde3a43ba253d50375d317c047b/LICENSE',
					},
				],
				keyGeneration: KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
				multipartyKeyReconstruction:
					MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			// Trail of Bits audited the upstream DKLS23 library that Vultisig depends
			// on, but that report covers the library rather than the Vultisig
			// applications, so it is not recorded as a wallet audit here.
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: null,
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
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
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
		walletCall: null,
	},
	variants: {
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: true,
		[Variant.MOBILE]: true,
	},
}
