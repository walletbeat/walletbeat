import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { sigri } from '@/data/contributors/sigri'
import type { SoftwareWallet } from '@/data/software-wallets'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { fullyClosedSource } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const mtpelerin: SoftwareWallet = {
	metadata: {
		id: 'mtpelerin',
		displayName: 'Bridge Wallet',
		tableName: 'Bridge Wallet',
		coinspectId: 'bridge-wallet',
		contributors: [sigri, mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			repositories: ['https://github.com/mtpelerin'],
			socials: {
				discord: 'https://discord.com/invite/WErDKTvMr7',
				facebook: 'https://www.facebook.com/mtpelerin/',
				instagram: 'https://www.instagram.com/mtpelerin/',
				linkedin: 'https://www.linkedin.com/company/mt-pelerin/',
				x: 'https://x.com/mtpelerin',
				youtube: 'https://www.youtube.com/@mtpelerin',
			},
			websites: ['https://www.mtpelerin.com/'],
		},
	},
	features: {
		/*accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			// BIP support is not verified
			eoa: supported({
				canExportPrivateKey: true,
				eip7702: notSupported,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
		},*/
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
		licensing: fullyClosedSource,
		monetization: {
			ref: [
				{
					explanation:
						'Mt Pelerin "was bootstrapped by our community the next year through an equity crowdfunding that raised more than $2 million, the first one to offer a tokenized share".',
					url: 'https://developers.mtpelerin.com/additional-information/about-mt-pelerin',
				},
				{
					explanation:
						'Swap and bridge commission is published: free up to 499, then 0.3%; on- and off-ramp tiers are also published, and Mt Pelerin says it takes no spread.',
					url: 'https://developers.mtpelerin.com/service-information/pricing-and-limits/swap-pricing',
				},
				{
					explanation: 'Integrators receive a 25% share of the fees charged to users they refer.',
					url: 'https://developers.mtpelerin.com/service-information/revenue-sharing',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: false,
				publicOffering: true,
				selfFunded: true,
				transparentConvenienceFees: true,
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
			privacyPolicy: 'https://www.mtpelerin.com/privacy-policy',
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
			accountRecovery: {
				drills: null,
				guardianRecovery: notSupportedWithRef({
					ref: {
						explanation:
							'Recovery is only from the user\'s secret phrase: "we have no way to help you recover it if you lose your secret phrase."',
						url: 'https://www.mtpelerin.com/faq',
					},
				}),
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'The bug bounty program is focused around its smart contracts, mobile apps and website, and is mostly aimed at addressing serious security issues directly affecting fund safety and user data protection.',
						url: 'https://immunefi.com/bug-bounty/mtpelerin/information/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-02-08' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.IMMUNEFI,
				rewards: supported({
					currency: 'USD',
					maximum: 5000,
					minimum: 1000,
				}),
				upgradePathAvailable: false,
			}),
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'"The purpose of Bridge Wallet\'s password is to encrypt and secure your secret phrase on your device, but none of them are stored elsewhere."',
						url: 'https://www.mtpelerin.com/faq',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			// No audit of the Bridge Wallet app found. The only listed audit is ChainSecurity's 2019 review of the Bridge Protocol v2.0 smart contracts.
			// Source: https://developers.mtpelerin.com/bridge-protocol/security-and-audits
			publicSecurityAudits: [],
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
				artifactSigning: notSupported,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: notSupported,
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: {
						explanation:
							'The app is closed source. WalletScrutiny: "Build cannot be done because the source code is not publicly available."',
						url: 'https://walletscrutiny.com/android/com.mtpelerin.bridge/',
					},
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
