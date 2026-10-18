import { lucemans } from '@/data/contributors/lucemans'
import { minimalsm } from '@/data/contributors/minimalsm'
import { zellic } from '@/data/entities/zellic'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const family: SoftwareWallet = {
	metadata: {
		id: 'family',
		displayName: 'Family',
		tableName: 'Family',
		coinspectId: 'family',
		contributors: [lucemans, minimalsm],
		iconExtension: 'png',
		lastUpdated: '2026-10-18',
		urls: {
			docs: ['https://family.co/docs'],
			socials: {
				x: 'https://x.com/family',
			},
			websites: ['https://family.co'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			// BIP support is not verified
			eoa: supported({
				ref: refTodo,
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
				'1193': null,
				'2700': null,
				'6963': null,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation:
						'Family licenses the app for personal use only and does not allow copying, modifying, or decompiling it. Its source code is not public.',
					label: 'Family terms of service',
					url: 'https://family.co/terms',
				},
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: {
				explanation: 'Family says it charges no fees of its own. Users pay only network fees.',
				label: 'Family FAQ',
				url: 'https://family.co/faqs',
			},
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: false,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: false,
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
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [
				{
					ref: {
						explanation:
							'Zellic reviewed the Family iOS app and found three high and two medium severity issues. The report lists a fix for each of them.',
						label: 'Zellic security assessment of Family Wallet for iOS',
						url: 'https://family.co/media/family-wallet-audit-report-2024.pdf',
					},
					auditDate: '2024-02-28',
					auditor: zellic,
					codeSnapshot: {
						commit: 'abe1d78615984662c3a9f1f80a443ec51b889f2a',
						date: '2024-01-29',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.MOBILE]: true },
				},
			],
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
	},
}
