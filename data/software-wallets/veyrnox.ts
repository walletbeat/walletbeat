import { alJobson } from '@/data/contributors/al-jobson'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

/**
 * VEYRNOX — seedless self-custody mobile wallet (iOS + Android).
 *
 * Skeleton entry: metadata is complete and accurate; feature fields are `null`
 * pending full test-and-code review. Wallet is live on the App Store
 * (apps.apple.com/app/id6790188660); Android release is imminent.
 *
 * Distinguishing traits worth confirming during rating:
 * - No BIP-39 seed phrase in the UI. Onboarding uses an 8-digit PIN; keys are
 *   generated inside the Secure Enclave / StrongBox.
 * - Backup uses Shamir Secret Sharing (SLIP-39) across the device and the
 *   user's own cloud storage. VEYRNOX holds no shard.
 * - Coercion features on the Safety Plus tier: duress PIN, decoy wallet,
 *   Panic Wipe.
 * - Address screening on the AI Security Protection tier only.
 */
export const veyrnox: SoftwareWallet = {
	metadata: {
		id: 'veyrnox',
		displayName: 'VEYRNOX',
		tableName: 'VEYRNOX',
		coinspectId: null,
		contributors: [alJobson],
		iconExtension: 'png',
		lastUpdated: '2026-09-06',
		urls: {
			docs: ['https://veyrnox.com/docs'],
			repositories: ['https://github.com/veyrnox'],
			socials: {
				linkedin: 'https://www.linkedin.com/company/veyrnoxwallet',
				x: 'https://x.com/VeyrnoxWallet',
			},
			websites: ['https://veyrnox.com/'],
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
		licensing: null,
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
			privacyPolicy: null,
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
		[Variant.BROWSER]: false,
		[Variant.DESKTOP]: false,
	},
}
