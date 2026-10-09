import { minimalsm } from '@/data/contributors/minimalsm'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import { nethermind } from '@/data/entities/nethermind'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const nethermindOmniAudit: SecurityAudit = {
	ref: [
		{
			explanation:
				'Nethermind audit of the current account contracts, including the account factory and the passkey recovery validator. It reports one low, one informational, and one best-practice finding, all acknowledged.',
			url: 'https://github.com/getclave/audits/blob/590a0b80b45663b337bca6004f58f67371590e0c/reports/accounts/evm-accounts_250725_Nethermind.pdf',
		},
	],
	auditDate: '2025-08-25',
	auditor: nethermind,
	unpatchedFlaws: 'NONE_FOUND',
	variantsScope: 'ALL_VARIANTS',
}

export const clave: SoftwareWallet = {
	metadata: {
		id: 'clave',
		displayName: 'Clave',
		tableName: 'Clave',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [patrickalphac, minimalsm],
		iconExtension: 'png',
		lastUpdated: '2026-10-09',
		urls: {
			appstore: 'https://apps.apple.com/app/id6449253761',
			docs: ['https://docs.getclave.com'],
			playstore: 'https://play.google.com/store/apps/details?id=com.clave.mobile',
			socials: {
				farcaster: 'https://warpcast.com/getclave',
				linkedin: 'https://linkedin.com/company/getclave',
				telegram: 'https://t.me/getclave',
				x: 'https://x.com/getclave',
			},
			websites: ['https://www.getclave.com'],
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
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The public repositories of the Clave GitHub organization hold the earlier account contracts, forks, and helper libraries, but not the mobile app or the account contracts covered by the 2025 Nethermind audit.',
						label: 'Clave GitHub organization',
						url: 'https://github.com/getclave',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'The Clave GitHub organization profile describes Clave as an Ethereum Foundation (ERC-4337 Team) grantee.',
					url: 'https://github.com/getclave/.github/blob/f4aa6ac38ffa4a7f41feee19e4f2c37015522525/profile/README.md',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: true,
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
			privacyPolicy: 'https://www.getclave.com/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: {
				ref: [
					{
						explanation:
							'The signing key is a passkey created by the phone and kept in its Secure Enclave or passkey manager.',
						url: 'https://docs.getclave.com/en/passkeys-technical',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: [nethermindOmniAudit],
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
				reproducibleBuilds: null,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
