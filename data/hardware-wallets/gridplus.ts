import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import {
	type HardwarePrivacyImplementation,
	HardwarePrivacyType,
} from '@/schema/features/privacy/hardware-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	ComplexBenchmarkTransactions,
	DataExtraction,
	DataLocation,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { fullyClosedSource } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'

export const gridplusWallet: HardwareWallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		blurb: paragraph(`
			GridPlus Wallet is a secure hardware wallet that combines secure key storage
			with convenient authentication methods.
		`),
		contributors: [nconsigny, patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'gridplus-lattice1',
				name: 'GridPlus Lattice1',
				isFlagship: true,
				url: 'https://gridplus.io/products/lattice1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://docs.gridplus.io/'],
			repositories: ['https://github.com/GridPlus'],
			socials: {
				discord: 'https://discord.com/invite/gridplus',
				linkedin: 'https://www.linkedin.com/company/gridplus/',
				x: 'https://x.com/gridplus/',
			},
			websites: ['https://gridplus.io/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: [
					{
						explanation:
							'The Lattice1 supports full BIP-32, BIP-39, and BIP-44 key derivation standards, along with custom derivation paths and non-standard formats such as Ledger Live, Ledger Legacy, and Solflare/Ledger derivation paths for Solana.',
						url: 'https://docs.gridplus.io/lattice1/how-to-manage-your-seed-phrase',
					},
				],
				// The Lattice1 is not capable of exporting private keys by design.
				// SafeCards can export individual key pairs via open-source software.
				// Source: GridPlus team responses; https://docs.gridplus.io/safecards/introduction-to-safecards
				canExportPrivateKey: false,
				keyDerivation: {
					type: 'BIP32',
					// Seed phrase is viewable on-device with PIN entry and can be backed up to SafeCards.
					// Individual key pairs can be exported via SafeCard + open-source software + USB card reader.
					// The device itself cannot export the master key pair.
					// Source: GridPlus team responses; https://docs.gridplus.io/safecards/introduction-to-safecards
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: notSupported,
		},
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://docs.gridplus.io/apps-and-integrations/lattice-manager',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.AMBIRE]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
			},
		}),
		// GridPlus confirmed that the firmware source code is not publicly published.
		// Source: GridPlus team response — "The firmware code is not publicly published."
		licensing: fullyClosedSource,
		monetization: {
			ref: [
				{
					explanation: 'Grid+ is the first internally incubated venture to spin out of Consensys.',
					url: 'https://medium.com/@mark_dago/grid-progress-report-12-15-2017-fdb4e24ed2ed',
				},
				{
					explanation:
						'GridPlus VC funding includes Bankless Ventures, Consensys Mesh, Allatus Ventures, Dlab, and Game7.',
					url: 'https://pitchbook.com/profiles/company/184644-55',
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
				transparentConvenienceFees: null,
				ventureCapital: true,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: supported<HardwarePrivacyImplementation>({
				type: HardwarePrivacyType.PARTIAL,
				ref: [
					{
						explanation:
							'GridPlus does not implement telemetry. They do not store, sell, or share user data. At the point of sale they collect customer shipping information for regulatory compliance, then destroy it within six months.',
						url: 'https://gridplus.io/policies/privacy-policy',
					},
				],
				inspectableRemoteCalls: HardwarePrivacyType.PARTIAL,
				phoningHome: HardwarePrivacyType.PASS,
				wirelessPrivacy: HardwarePrivacyType.PARTIAL,
				// Source: gridplus team responses fileverse document
			}),
			privacyPolicy: 'https://gridplus.io/policies/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			// GridPlus does not implement guardian-based (social) recovery.
			// However, the Lattice1 does provide SafeCards which are PIN-protected smart cards
			// that serve as encrypted hardware backups of the user's seed phrase.
			// Users can create as many SafeCard backups as they like, and seed recovery
			// is possible using GridPlus's open-source software with a USB card
			// reader, without requiring GridPlus hardware.
			// See: https://docs.gridplus.io/safecards/introduction-to-safecards
			// This does not qualify as guardian-based recovery under Walletbeat's schema,
			// but it does mitigate seed phrase loss for users.
			accountRecovery: {
				drills: null,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-09-23' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations.',
							url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			firmware: {
				// Source: gridplus team responses fileverse document
				type: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
				details: 'The Lattice1 firmware source code is not publicly available.',
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: FirmwareType.PASS,
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The Lattice1 generates and stores key material entirely on-device. Full BIP-32, BIP-39, and BIP-44 derivation standards are supported, along with custom derivation paths.',
						url: 'https://docs.gridplus.io/lattice1/how-to-manage-your-seed-phrase',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
				// Source: gridplus team responses fileverse document
			},
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: supported({
				ref: [
					{
						explanation:
							'The Lattice1 meets stringent security industry standards including FIPS, PCI, and EAL 6+ and is the only hardware wallet designed to safeguard against edge case risks such as attackers remotely accessing a users secrets via RF emissions.',
						url: 'https://www.prnewswire.com/news-releases/gridplus-sets-a-new-standard-for-blockchain-security-with-the-release-of-the-enterprise-grade-lattice1-wireless-hardware-wallet-301186849.html',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							"Independent video demonstration of GridPlus's transaction implementation on Safe.",
						url: 'https://youtube.com/shorts/_s5PjZhgBig',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: displaysFullTransactionDetails,
				erc4361: null,
				erc7730: supported({
					ref: {
						explanation:
							"Independent video demonstration of GridPlus's clear signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=2079',
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
				}),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
