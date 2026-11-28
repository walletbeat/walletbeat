import { biafra23 } from '@/data/contributors/biafra23'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const punicus: SoftwareWallet = {
	metadata: {
		id: 'punicus',
		displayName: 'Punicus',
		tableName: 'Punicus',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [biafra23],
		iconExtension: 'svg',
		lastUpdated: '2026-11-19',
		urls: {
			docs: ['https://biafra23.github.io/punicus/guide.html'],
			repositories: ['https://github.com/biafra23/punicus'],
			websites: ['https://biafra23.github.io/punicus/'],
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
			ref: [
				{
					explanation:
						'The Funding section of the Punicus README says the developer funds the wallet today, that it seeks grants and sponsors, and that donations go through GitHub Sponsors.',
					url: 'https://github.com/biafra23/punicus#funding',
				},
				{
					explanation:
						'Punicus accepts donations through the GitHub Sponsors page of its developer.',
					url: 'https://github.com/sponsors/biafra23',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: true,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: false,
				ventureCapital: false,
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
				dependencyAgeGate: null,
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
		[Variant.DESKTOP]: true,
	},
}
