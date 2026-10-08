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
		lastUpdated: '2026-10-08',
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
				ref: [
					{
						explanation:
							'The terms grant only "a limited non-exclusive, non-transferable license, with no right to sublicense"; the audited wallet repositories named in the 2024 audit are private.',
						url: 'https://family.co/terms',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'"Family does not charge any additional fees for using the wallet. However, standard network fees still apply."',
					url: 'https://family.co/faqs',
				},
				{
					explanation:
						'"There are no additional fees for using the bridge, just the standard network fee for the transaction."',
					url: 'https://family.co/support/bridging',
				},
			],
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
			// No bug bounty or disclosure policy: family.co/security, /bug-bounty and /.well-known/security.txt return 404, and no Immunefi or HackerOne program exists for Family.
			// Source: https://family.co/terms
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
					ref: [
						{
							explanation:
								'Zellic assessment of the Family Wallet iOS application (January 29 to February 23, 2024): three High and two Medium findings, all acknowledged with fixes implemented.',
							url: 'https://family.co/media/family-wallet-audit-report-2024.pdf',
						},
					],
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
