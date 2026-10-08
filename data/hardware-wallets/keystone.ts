import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
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
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataExtraction,
	DataLocation,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { keylabs } from '../entities/keylabs'
import { slowMist } from '../entities/slowmist'

export const keystoneWallet: HardwareWallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone Wallet',
		tableName: 'Keystone',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keystone-pro',
				name: 'Keystone Pro',
				isFlagship: true,
				url: 'https://keyst.one/pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://support.keyst.one/'],
			repositories: ['https://github.com/KeystoneHQ'],
			socials: {
				facebook: 'https://web.facebook.com/people/Keystone-Wallet/',
				farcaster: 'https://farcaster.xyz/keystonewallet',
				reddit: 'https://www.reddit.com/r/KeystoneWallet/',
				telegram: 'https://t.me/KeystoneWallet',
				x: 'https://x.com/KeystoneWallet',
				youtube: 'https://www.youtube.com/channel/UCaReIdawwYPPcyWGoNunF7g',
			},
			websites: ['https://keyst.one/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'Keystone 3 Pro firmware 3.1.0 only parses legacy and EIP-1559 (type 2) Ethereum transactions; any other type is rejected as unsupported, and there is no authorization signing function.',
						url: 'https://github.com/KeystoneHQ/keystone3-firmware/blob/3.1.0/rust/rust_c/src/ethereum/mod.rs',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"Ethereum accounts use the BIP-44 path m/44'/60'/0'/0/n by default, with Ledger Live and Ledger legacy paths available.",
						url: 'https://github.com/KeystoneHQ/keystone3-firmware/blob/3.1.0/src/ui/gui_widgets/multi/web3/gui_multi_path_coin_receive_widgets.c',
					},
					{
						explanation:
							'Setup screen: "Back up your seed phrase. It cannot be viewed or exported later." Only extended public keys are shared with companion wallets.',
						url: 'https://github.com/KeystoneHQ/keystone3-firmware/blob/3.1.0/src/ui/lv_i18n/data.csv',
					},
				],
				canExportPrivateKey: false,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: false,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: notSupported,
		},
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://guide.keyst.one/docs/keystone',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.OTHER]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'Keystone 3 Pro firmware is MIT-licensed ("License: MIT Licensor: YANSSIE HK LIMITED"). The MCU vendor library is included only as a pre-compiled binary.',
						url: 'https://github.com/KeystoneHQ/keystone3-firmware/blob/master/LICENSE',
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Keystone and UniPass merged in May 2023 to form Account Labs, led by the former Keystone CEO.',
					url: 'https://www.techflowpost.com/en-US/article/11943',
				},
				{
					explanation:
						'Account Labs raised a $7.7M pre-Series A led by Amber Group with other venture investors in October 2023.',
					url: 'https://www.coincarp.com/fundraising/account-labs-preseries-a/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: false,
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
			hardwarePrivacy: null,
			privacyPolicy: 'https://keyst.one/privacy-policy',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash code in the Ethereum firmware; the Nexus app only offers plain send, receive and swap.
				// Source: https://github.com/KeystoneHQ/keystone3-firmware
				// Source: https://keyst.one/nexus
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
				// Recovery is only by entering the user's own seed phrase or Shamir shares: "never share it with anyone, including Keystone."
				// Source: https://guide.keyst.one/docs/faq
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							"Keystone runs a bug bounty for its hardware and firmware with reports sent to security@keyst.one; rewards are paid in Bitcoin at Keystone's discretion, with no published amounts.",
						url: 'https://keyst.one/bug-bounty-program',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-04-02' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Keystone strongly supports security research into our products and wants to encourage that research.',
							url: 'https://keyst.one/bug-bounty-program',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			duressResistance: null,
			firmware: {
				type: FirmwareType.PASS,
				// The bootloader only installs images signed with the vendor key; anything else is deleted with a "Firmware signature mismatch" error.
				// Source: https://github.com/KeystoneHQ/keystone3-bootloader/blob/master/app/firmware_update.c
				customFirmware: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The seed is generated on the device from the MCU random number generator and two secure element generators, mixed with a hash of the device password.',
						url: 'https://github.com/KeystoneHQ/keystone3-firmware/blob/3.1.0/src/managers/keystore.c',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation: 'Keystone 3 Pro security audit by KeyLabs',
							url: 'https://github.com/keylabsio/audits/blob/24e10a7404106494f66c5ebcf49b8fa4eaaa2d3c/2023-11-keystone3.pdf',
						},
					],
					auditDate: '2023-11-22',
					auditor: keylabs,
					codeSnapshot: undefined,
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
				{
					ref: [
						{
							explanation: 'Keystone 3 Pro security audit by SlowMist',
							url: 'https://github.com/slowmist/Knowledge-Base/blob/bbf894fc9c42d1e9af7b2690f54fc94c7d0fc299/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20Keystone3_en-us.pdf',
						},
					],
					auditDate: '2023-09-07',
					auditor: slowMist,
					codeSnapshot: undefined,
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
			],
			secureElement: supported({
				ref: [
					{
						explanation:
							'Keystone 3 incorporates a PCI-grade anti-tampering feature, with an intricate ‘security house’ of circuitry encompassing the core IC and Secure Element chips.',
						url: 'https://blog.keyst.one/secure-elements-the-bedrock-of-hardware-wallet-security-1dd8cbdef461',
					},
				],
				secureElementType: SecureElementType.PCI,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// No published documentation or audit of manufacturing or key provisioning; the Keylabs audit only recommends tracking units through manufacturing.
				// Source: https://github.com/keylabsio/audits/blob/main/2023-11-keystone3.pdf
				// The listed box contents (device, manual, seed sheets, cable) mention no seal, and the setup guides rely on online device verification instead.
				// Source: https://keyst.one/shop/products/keystone-3pro
				// Schematics and BOM for hardware v3.1 and v3.2 are published; PCB layout files are not.
				// Source: https://github.com/KeystoneHQ/keystone3-firmware/tree/master/hardware
				// A mesh board covers the sensitive parts; removing it erases the secrets and bricks the device, even with the main battery drained. Three secure elements (Microchip and Maxim parts).
				// Source: https://github.com/keylabsio/audits/blob/main/2023-11-keystone3.pdf
				// Device verification: "Device verification is based on a cryptographic signature mechanism." The step is skippable during setup.
				// Source: https://keyst.one/authentication
				type: SupplyChainFactoryType.FAIL,
				details:
					'No factory documentation or audit; no tamper-evident packaging found; schematics and BOM published without PCB layout; mesh-protected board that wipes secrets when opened; online cryptographic device verification.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PARTIAL,
				tamperEvidence: SupplyChainFactoryType.FAIL,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://keyst.one/authentication',
			},
			transactionLegibility: {
				ref: [
					{
						explanation:
							"Independent video demonstration of Keystone's transaction implementation on a Safe.",
						url: 'https://youtube.com/shorts/Ly9lo4g5NpA',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: true,
				},
				detailsDisplayed: {
					...displaysFullTransactionDetails,
					nonce: DataDisplayOptions.NOT_IN_UI,
				},
				erc4361: null,
				erc7730: supported({
					ref: {
						explanation:
							"Independent video demonstration of Keystone's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=759',
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataLocation.NOT_PROVIDED,
				}),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: {
				// "Keystone hardware wallets include a 1-year limited warranty starting from the date of delivery." Keystone Care+ extends it to 2 or 3 years for a fee.
				// Source: https://keyst.one/terms-of-conditions
				// No drop, water or MTBF figures, and no repair service, spare parts or battery replacement instructions found. The device has a rechargeable battery plus a coin cell for the tamper circuit.
				// Source: https://guide.keyst.one/docs/faq
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'One-year warranty with paid extension to two or three years; no durability ratings, MTBF data, repair service or battery replacement path.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.FAIL,
				url: 'https://keyst.one/terms-of-conditions',
				warrantyExtensions: MaintenanceType.PASS,
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
				// In-house board design using third-party MCU and secure element chips. The project began in 2018 under its earlier brand and relaunched as Keystone in 2021, run by the original team.
				// Source: https://keyst.one/about-us
				// Keystone 3 Pro firmware is actively released (3.1.0 in September 2026); the previous-generation Keystone Pro/Essential app last released in May 2024 with no end-of-life notice.
				// Source: https://github.com/KeystoneHQ/keystone3-firmware/releases
				// Source: https://github.com/KeystoneHQ/Keystone-cold-app/releases
				// No security advisory page: the 2024 Offside Labs finding was announced without details, and the 2026 USB SDK flaw (fixed in 2.4.0) was disclosed by OneKey and in a post on X.
				// Source: https://onekey.so/blog/en/learn/usb-sdk-vulnerability-hardware-wallet-seed-extraction
				// Bug bounty with safe harbor, but no published reward amounts.
				// Source: https://keyst.one/bug-bounty-program
				type: ReputationType.PARTIAL,
				availability: ReputationType.PARTIAL,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original design on the market since 2018 (under its earlier brand); unclear support status for the previous generation; vulnerabilities disclosed without a dedicated advisory list; bug bounty without published reward amounts.',
				disclosureHistory: ReputationType.PARTIAL,
				originalProduct: ReputationType.PASS,
				url: 'https://keyst.one/about-us',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
