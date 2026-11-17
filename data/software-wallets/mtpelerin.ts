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
		lastUpdated: '2026-10-18',
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
						'Mt Pelerin raised its early funding through a public equity crowdfunding that sold tokenized shares.',
					label: 'About Mt Pelerin',
					url: 'https://developers.mtpelerin.com/additional-information/about-mt-pelerin',
				},
				{
					explanation:
						'Mt Pelerin publishes the commission it charges on purchases, sales, and swaps, and says this is the only way it earns money from users.',
					label: 'Mt Pelerin pricing',
					url: 'https://www.mtpelerin.com/pricing',
				},
				{
					explanation:
						'Apps that integrate the Mt Pelerin exchange service receive a share of the fees paid by the users they bring.',
					label: 'Mt Pelerin revenue sharing',
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
							'The wallet can only be restored from its secret phrase. Mt Pelerin cannot help recover a wallet if the phrase is lost.',
						label: 'Bridge Wallet FAQ',
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
				ref: {
					explanation:
						'Mt Pelerin says only the user knows the secret phrase, and that it is kept encrypted on the device and not stored anywhere else.',
					label: 'Bridge Wallet FAQ',
					url: 'https://www.mtpelerin.com/faq',
				},
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
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
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: notSupported,
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: {
						explanation:
							'WalletScrutiny could not rebuild the app because its source code is not public.',
						label: 'WalletScrutiny review of Bridge Wallet for Android',
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
