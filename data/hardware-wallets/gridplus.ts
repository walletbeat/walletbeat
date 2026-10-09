import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
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
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
} from '@/schema/features/security/duress-resistance'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	ComplexBenchmarkTransactions,
	DataExtraction,
	DataLocation,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { notSupported, supported } from '@/schema/features/support'
import { fullyClosedSource } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const gridplusWallet: HardwareWallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, patrickalphac, mattmatt, minimalsm],
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
		lastUpdated: '2026-10-09',
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
			// The device shows "Authorize Contract" with the contract address, chain ID and nonce; the SDK exposes signAuthorization.
			// Source: https://github.com/GridPlus/gridplus-sdk/blob/ba9cecdd7bea47c98e33dee70e954e6a3a14be59/packages/docs/docs/signing.md
			eip7702: supported({
				ref: [
					{
						explanation: 'Lattice1 firmware v0.18.8 (June 18, 2025) added "EIP-7702 support".',
						url: 'https://github.com/GridPlus/lattice-software-releases/blob/72233a9767066e4dd4707ec0c924198617eb5ea6/history/HSM.md',
					},
				],
				contract: 'UNKNOWN',
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							'The Lattice1 supports full BIP-32, BIP-39, and BIP-44 key derivation standards, along with custom derivation paths and nonstandard formats such as Ledger Live, Ledger Legacy, and Solflare/Ledger derivation paths for Solana.',
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
			ref: [
				'https://docs.gridplus.io/apps-and-integrations/lattice-manager',
				{
					explanation:
						'"The GridPlus SDK lets any application establish a connection and interact with a GridPlus Lattice1 device as a remote signer." Apps pair using a code shown on the device screen.',
					url: 'https://docs.gridplus.io/resources/developer-resources',
				},
				{
					explanation: 'The GridPlus SDK is MIT-licensed.',
					url: 'https://github.com/GridPlus/gridplus-sdk/blob/ba9cecdd7bea47c98e33dee70e954e6a3a14be59/LICENSE',
				},
				{
					explanation:
						'The SDK fetches ABIs for calldata decoding from Etherscan-family block explorers, with the 4byte signature directory as a fallback, rather than from GridPlus.',
					url: 'https://github.com/GridPlus/gridplus-sdk/blob/ba9cecdd7bea47c98e33dee70e954e6a3a14be59/packages/docs/docs/tutorials/calldataDecoding.md',
				},
			],
			requiresManufacturerConsent: { type: 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE' },
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
					explanation:
						'GridPlus was spun out of Consensys in October 2017 after a $29 million initial coin offering.',
					url: 'https://decrypt.co/4324/electric-dreams',
				},
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
				publicOffering: true,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: true,
			},
		},
		multiAddress: supported({
			ref: [
				{
					explanation:
						'The SDK returns up to 10 sequential addresses per request from a configurable start path, and each address becomes a separate account in wallets such as MetaMask.',
					url: 'https://github.com/GridPlus/gridplus-sdk/blob/ba9cecdd7bea47c98e33dee70e954e6a3a14be59/packages/docs/docs/addresses.md',
				},
				{
					explanation: '"Each address will create a new standalone MetaMask account."',
					url: 'https://docs.gridplus.io/apps-and-integrations/metamask/connecting-to-metamask',
				},
			],
		}),
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
			transactionPrivacy: {
				// Lattice Manager sends only Bitcoin and points Ethereum users to MetaMask, Frame or Rabby; no private transfer support is documented.
				// Source: https://docs.gridplus.io/apps-and-integrations/lattice-manager
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
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
				ref: [
					{
						explanation:
							"GridPlus bug bounty and responsible disclosure policy: hardware and firmware attacks on the Lattice1 and SafeCards in scope; rewards at GridPlus's sole discretion with no published amounts.",
						url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
					},
				],
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
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								'A 4 to 6 digit device PIN is required during setup; a lockout timer starts after 3 incorrect attempts and doubles with each further one.',
							url: 'https://docs.gridplus.io/setup/lattice1',
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: supported({
							type: BasicUnlockMechanismSupport.REQUIRED,
						}),
						[BasicUnlockMechanism.PASSWORD]: notSupported,
						[BasicUnlockMechanism.BIOMETRIC]: notSupported,
						[BasicUnlockMechanism.PATTERN]: notSupported,
					},
				},
				// The firmware reference lists PIN, SafeCard PIN and sleep-timer settings and no duress PIN,
				// decoy wallet or wipe credential.
				// Source: https://docs.gridplus.io/lattice1/lattice1-firmware-reference
				duressMode: notSupported,
			},
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
			// No public independent audit of the Lattice1 firmware, bootloader, SafeCard applet or Lattice Manager found (GridPlus docs, blog, GitHub, WalletScrutiny, web search).
			// Source: https://docs.gridplus.io/lattice1/security-features
			publicSecurityAudits: [],
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
			supplyChainFactory: {
				// GridPlus says all manufacturing is done under its direct supervision in a facility also used by defense contractors. No provisioning procedure is published, and no factory audit was found.
				// Source: https://gridplus.io/pages/contact
				// No tamper-evident seal is described; the terms only refer to returns with packaging "opened, broken, or otherwise tampered with".
				// Source: https://docs.gridplus.io/resources/shipping-and-delivery
				// No schematics, PCB files or BOM are published; GitHub has only the SDK, tools, release notes and the SafeCard applet.
				// Source: https://github.com/GridPlus
				// An armed tamper mesh (PCB layers, 3D enclosure, conductive elastomer) wipes and bricks the device if tripped; no debug access to the secure compute environment.
				// Source: https://docs.gridplus.io/lattice1/security-features
				// Each device has an ID key signed by GridPlus; Verify Lattice signs a user challenge checked on a GridPlus page.
				// Source: https://docs.gridplus.io/lattice1/lattice1-guides/how-to-verify-that-your-lattice1-is-authentic
				type: SupplyChainFactoryType.FAIL,
				details:
					'Supervised manufacturing claimed without documentation or audit; no tamper-evident seal described; no published hardware design; armed tamper mesh that wipes the device; cryptographic device verification.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.PARTIAL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.FAIL,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://docs.gridplus.io/lattice1/security-features',
			},
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
			interoperability: {
				type: InteroperabilityType.PARTIAL,
				ref: [
					{
						explanation:
							'GridPlus documents integrations with independent wallets including MetaMask, Rabby, NuFi, Frame and Ambire.',
						url: 'https://docs.gridplus.io/lattice1/lattice1-introduction',
					},
					{
						explanation:
							'By default the Lattice1 connects to and routes requests through GridPlus cloud infrastructure, end-to-end encrypted. Users can run their own endpoint instead.',
						url: 'https://docs.gridplus.io/apps-and-integrations/lattice-manager/connecting-your-lattice-to-your-own-private-endpoint',
					},
					{
						explanation:
							'With a self-hosted Lattice Connect V2 endpoint the device stays connected to GridPlus cloud; disconnecting it fully requires changing settings over SSH.',
						url: 'https://github.com/GridPlus/lattice-connect-v2/blob/646115eb82ddc53f4554748fea37ef8a777162e8/README.md',
					},
					{
						explanation:
							'The SDK sends requests to `https://signing.gridpl.us` unless the app sets another base URL.',
						url: 'https://github.com/GridPlus/gridplus-sdk/blob/ba9cecdd7bea47c98e33dee70e954e6a3a14be59/packages/sdk/src/constants.ts#L148',
					},
				],
				details:
					'Works with several independent wallets through an open SDK, without a GridPlus account. App-to-device traffic goes through GridPlus servers by default; a self-hosted relay is possible but the device stays connected to GridPlus cloud unless reconfigured over SSH.',
				interoperability: InteroperabilityType.PASS,
				noSupplierLinkage: InteroperabilityType.PARTIAL,
			},
		},
		transparency: {
			maintenance: {
				// No drop or water ratings; dropping the device can trip an armed mesh and wipe it. The mesh battery lasts "around 5 years" unplugged; if depleted while armed the device erases its data. No replacement path is documented.
				// Source: https://docs.gridplus.io/lattice1/security-features
				// SafeCards are rated for "around 2000 inserts".
				// Source: https://docs.gridplus.io/safecards/introduction-to-safecards
				// The terms reference a separate Limited Warranty that could not be found; returns within 14 days, defective units replaced.
				// Source: https://gridplus.io/policies/refund-policy
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'No durability ratings; battery and card lifetime figures but no MTBF; defective units replaced; non-replaceable mesh battery whose depletion wipes the device; warranty terms not published.',
				mtbfDocumentation: MaintenanceType.PARTIAL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://docs.gridplus.io/lattice1/security-features',
				warrantyExtensions: MaintenanceType.FAIL,
			},
			operationFees: null,
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
			reputation: {
				// Founded 2017 as a ConsenSys spin-out; Lattice1 firmware releases since September 2020, latest v0.18.9 (October 2025). Own architecture; the SafeCard applet is a fork of Status Keycard.
				// Source: https://github.com/GridPlus/lattice-software-releases/blob/72233a9767066e4dd4707ec0c924198617eb5ea6/history/HSM.md
				// No security advisories or disclosed vulnerabilities; changelog entries such as "Firmware security updates" give no details.
				// Source: https://github.com/GridPlus/lattice-software-releases/blob/72233a9767066e4dd4707ec0c924198617eb5ea6/history/HSM.md
				// Bug bounty with safe harbor but no published reward amounts.
				// Source: https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original design on the market since 2020 and still sold; security fixes shipped without advisories; bug bounty without published reward amounts.',
				disclosureHistory: ReputationType.FAIL,
				originalProduct: ReputationType.PASS,
				url: 'https://github.com/GridPlus/lattice-software-releases/blob/72233a9767066e4dd4707ec0c924198617eb5ea6/history/HSM.md',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
