import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const cloaked: SoftwareWallet = {
	metadata: {
		id: 'cloaked',
		displayName: 'Cloaked',
		tableName: 'Cloaked',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm],
		iconExtension: 'png',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://clkd.xyz/docs'],
			repositories: [
				'https://github.com/cloakedxyz/clkd-stealth',
				'https://github.com/cloakedxyz/clkd-recovery',
				'https://github.com/cloakedxyz/account',
			],
			socials: {
				farcaster: 'https://farcaster.xyz/cloaked',
				telegram: 'https://t.me/+pXdSklUm5bsxMmMx',
				x: 'https://x.com/staycloakedxyz',
			},
			webapps: ['https://app.clkd.xyz'],
			websites: ['https://clkd.xyz'],
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
							"Cloaked's stealth address SDK, which derives the spending and viewing keys and generates stealth addresses, is MIT-licensed.",
						url: 'https://github.com/cloakedxyz/clkd-stealth/blob/9eb359efdd4ea31f5504bf81e57dcfe6f966dc14/LICENSE',
					},
				],
				license: FOSSLicense.MIT,
			},
			walletAppLicense: {
				ref: [
					{
						explanation:
							'L2BEAT reports that the production Cloaked web wallet is closed source, has no published reproducible build, and cannot be self-hosted. Only the derivation SDK, API schema and recovery client are published.',
						url: 'https://l2beat.com/privacy/projects/cloaked',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
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
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://clkd.xyz/docs/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
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
		[Variant.BROWSER]: true,
	},
}
