import { minimalsm } from '@/data/contributors/minimalsm'
import { mmlado } from '@/data/contributors/mmlado'
import { phift } from '@/data/contributors/phift'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
	DuressAction,
} from '@/schema/features/security/duress-resistance'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { SupplyChainDIYType } from '@/schema/features/security/supply-chain-diy'
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataExtraction,
	DataLocation,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const keycardShell: HardwareWallet = {
	metadata: {
		id: 'keycard-shell',
		displayName: 'Keycard Shell',
		tableName: 'Keycard Shell',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [phift, mmlado, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keycard-shell',
				name: 'Keycard Shell',
				isFlagship: true,
				url: 'https://get.keycard.tech/pages/keycard-shell',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://keycard.tech/en/developers/overview', 'https://keycard.tech/start/shell'],
			repositories: [
				'https://github.com/keycard-tech/keycard-shell',
				'https://github.com/keycard-tech/status-keycard',
				'https://github.com/keycard-tech/eth-abi-repo',
			],
			socials: {
				x: 'https://x.com/Keycard_',
			},
			websites: ['https://keycard.tech/', 'https://shell.keycard.tech/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'Firmware v1.4.0 signs only legacy, EIP-2930 and EIP-1559 Ethereum transactions; other types return ERR_UNSUPPORTED, and there is no raw-hash signing for authorization tuples.',
						url: 'https://github.com/keycard-tech/keycard-shell/blob/v1.4.0/app/core/core_eth.c',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"BIP-39 (12 or 24 words) or SLIP-39 backups; the Ethereum default path is m/44'/60'/0'/0/N.",
						url: 'https://docs.keycard.tech/en/help/other-derivation-path-support',
					},
					{
						explanation:
							'"Transaction-signing keys never leave the card. Only the public key can be exported for an arbitrary path. Private key export is restricted to paths under the EIP-1581 subtree".',
						url: 'https://docs.keycard.tech/en/developers/apdu/exportkey',
					},
					{
						explanation:
							'The recovery phrase cannot be shown again; "Verify" only checks a phrase the user enters against the card.',
						url: 'https://docs.keycard.tech/en/help/verify-your-keycards-seed-and-addresses',
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
		// Ecosystem: Keycard Shell works with Ethereum + Bitcoin wallets via air-gapped QR codes
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: [
				{
					explanation:
						'Blog announces ERC-4527 + BC-UR support; lists MetaMask, Rabby, imToken, Bitget, UniSat, Nunchuk, Sparrow, Specter',
					url: 'https://keycard.tech/blog/announcing-keycard-shell',
				},
				{
					explanation: 'Compatible wallets list page',
					url: 'https://keycard.tech/wallets',
				},
				{
					explanation:
						'Marketing page lists transaction signing with MetaMask, imToken, Rabby, Bitget, UniSat, Nunchuk, Sparrow, Specter',
					url: 'https://get.keycard.tech/pages/keycard-shell',
				},
			],
			requiresManufacturerConsent: null,
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				// Additional EVM wallets (imToken, Bitget) + Bitcoin wallets (Nunchuk, Sparrow, Specter, UniSat)
				[SoftwareWalletType.OTHER]: true,
			},
		}),
		// Transparency: Shell firmware and hardware designs are MIT-licensed
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation: 'Keycard Shell firmware and hardware designs are MIT-licensed',
					url: 'https://github.com/keycard-tech/keycard-shell/blob/48020c66841b795b4766e358f4b108a33654a347/LICENSE',
				},
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: {
				explanation: 'Keycard Shell is sold as a hardware product',
				url: 'https://github.com/keycard-tech/keycard-shell',
			},
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
		// Multi-address: wallet app selects which accounts to use; Shell signs for any derived address
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: notSupported,
				usage: notSupported,
			},
			dataCollection: null,
			// Privacy: No radio onboard; USB data transfer can be disabled; air-gapped via QR
			hardwarePrivacy: {
				type: HardwarePrivacyType.PASS,
				details:
					'No radio (BLE/WiFi) onboard; USB data transfer can be disabled; designed for air-gapped operation via QR codes',
				// No radio means no wireless phoning home possible
				inspectableRemoteCalls: HardwarePrivacyType.PASS,
				phoningHome: HardwarePrivacyType.PASS,
				url: 'https://github.com/keycard-tech/keycard-shell',
				wirelessPrivacy: HardwarePrivacyType.PASS,
			},
			privacyPolicy: 'https://keycard.tech/legal/privacy-policy',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash code in the firmware; transfers are made by third-party wallets using the Shell as a QR signer.
				// Source: https://docs.keycard.tech/en/help/faq
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
				// Recovery is only from the user's own BIP-39 or SLIP-39 phrases: "Use your recovery phrase to restore your wallet on a new device."
				// Source: https://docs.keycard.tech/en/help/faq
				guardianRecovery: notSupported,
			},
			// No Keycard bug bounty found. The parent organization's bug bounty programs (Status, Logos) are paused and do not list Keycard in scope; no security.txt on keycard.tech.
			// Source: https://hackenproof.com/company/ift/programs
			bugBountyProgram: notSupported,
			duressResistance: {
				basicUnlock: {
					ref: [
						'https://github.com/keycard-tech/keycard-shell/blob/b25a5f8149990d5bef3c86355b3e60281427c90d/app/keycard/keycard.c#L240',
						'https://docs.keycard.tech/duress_pin',
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
				duressMode: supported({
					ref: [
						'https://github.com/keycard-tech/keycard-shell/blob/b25a5f8149990d5bef3c86355b3e60281427c90d/app/ui/english.c#L140',
						'https://docs.keycard.tech/duress_pin',
					],
					actions: {
						[DuressAction.DECOY_WALLET]: true,
						[DuressAction.SELF_DESTRUCT]: false,
						[DuressAction.ONCHAIN_LOCKDOWN]: false,
						[DuressAction.WIPE_AND_FORWARD]: false,
					},
				}),
			},
			// Firmware: open source MIT, reproducible builds, manual updates with hash verification
			firmware: {
				type: FirmwareType.PASS,
				// "Production Keycard Shell devices only accept signed firmware updates." Custom firmware needs a self-built device or dev unit with a bootloader key you control.
				// Source: https://docs.keycard.tech/en/developers/diy-keycard-shell
				customFirmware: FirmwareType.FAIL,
				details:
					'Firmware is MIT-licensed and open source; builds are fully reproducible (bootloader uses public key to verify firmware signature); users verify firmware by matching hashes via provided script; air-gapped update flow available with SHA256 checksum verification',
				// Firmware source is open (MIT license)
				firmwareOpenSource: FirmwareType.PASS,
				// README: "build is fully reproducible" + "Verifying the firmware... matching the hashes"
				reproducibleBuilds: FirmwareType.PASS,
				// Updates require unlock + approve; air-gapped update option with SHA256 checksums
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://github.com/keycard-tech/keycard-shell',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Keycard is a BIP-32 HD wallet running on JavaCard; keys generated and stored on secure element',
						url: 'https://github.com/keycard-tech/status-keycard',
					},
					{
						explanation:
							'Private key export is restricted to EIP-1581 subtree only (typical wallet paths not exportable)',
						url: 'https://keycard.tech/developers/apdu/exportkey',
					},
				],
				// Keys are generated on the Keycard smartcard itself
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				// Single-key model, not multiparty
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			// No public third-party audit of the Shell firmware, bootloader or Keycard applet found. The card chip (EAL6+) and MCU (PSA Level 3) certifications are chip-level, not audits of Keycard code.
			// Source: https://docs.keycard.tech/en/developers/hardware-specification
			publicSecurityAudits: [],
			secureElement: supported({
				ref: {
					explanation:
						'Keys stored on removable Keycard smartcard with EAL6+ certified secure element',
					url: 'https://github.com/keycard-tech/keycard-shell',
				},
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			// Keys handling: generated on-device (Keycard smartcard), BIP-32 HD wallet, no multiparty
			supplyChainDIY: {
				type: SupplyChainDIYType.PASS,
				componentSourcingComplexity: SupplyChainDIYType.PASS,
				details:
					'Full hardware designs, schematics, PCB files, and BOM are publicly available under MIT license. The Keycard secure element is a standard JavaCard 3.0.5 applet — any compatible card works, no NDA required. All other components are commodity parts from standard distributors.',
				diyNoNda: SupplyChainDIYType.PASS,
				url: 'https://github.com/keycard-tech/keycard-shell/tree/c2cf30bc46ab665a3b4a06fe0513e51ffb87d49c/hardware',
			},
			supplyChainFactory: {
				// No manufacturing or provisioning documentation beyond a factory test firmware and a tool for importing factory lists of device public keys.
				// Source: https://github.com/keycard-tech/keycard-shell
				// No packaging seals: Keycard says seals "can create a false sense of security and can be cloned" and relies on cryptographic verification.
				// Source: https://docs.keycard.tech/en/blog/keycard-shell-verification-what-verify-actually-proves-and-why-it-matters
				// Schematics, PCB files, fabrication files and BOM for the serial run are published in the repository.
				// Source: https://github.com/keycard-tech/keycard-shell/tree/master/hardware/shell/serial_run
				// Keys live on the Keycard (NXP smart card chip, CC EAL6+); the Shell's MCU has a write-protected bootloader. No mesh or epoxy is documented.
				// Source: https://docs.keycard.tech/en/developers/hardware-specification
				// "During verification, the Shell signs a one-time QR challenge and includes its device certificate"; cards carry a factory-signed certificate.
				// Source: https://docs.keycard.tech/en/help/verify-keycard-shell-authenticity
				type: SupplyChainFactoryType.PARTIAL,
				details:
					'No factory security documentation or audit; no tamper-evident packaging by design; full hardware design files published; keys on an EAL6+ smart card; cryptographic device and card verification.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PASS,
				tamperEvidence: SupplyChainFactoryType.FAIL,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://docs.keycard.tech/en/help/verify-keycard-shell-authenticity',
			},
			// Transaction legibility: QR-based signing via ERC-4527
			transactionLegibility: {
				ref: [
					{
						explanation: 'ERC-4527 defines QR code format for Ethereum transaction signing',
						url: 'https://eips.ethereum.org/EIPS/eip-4527',
					},
					{
						explanation:
							'Keycard Shell uses ERC-4527 for EVM and BC-UR for Bitcoin QR-based signing',
						url: 'https://github.com/keycard-tech/keycard-shell',
					},
					{
						explanation:
							'Product page emphasizes human-readable transaction data and verifying transaction data on-device display',
						url: 'https://get.keycard.tech/pages/keycard-shell',
					},
				],
				// Data extraction: QR codes used for transaction data (ERC-4527); display visible to eyes
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: true,
				},
				detailsDisplayed: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				erc4361: null,
				erc7730: supported({
					ref: [
						{
							explanation: 'Blog post announces ETH ABI database updates for contract decoding',
							url: 'https://keycard.tech/blog/a-shell-summer-btc-multisig-seedqr-stealth-passphrases-arrive-on-keycard-shell',
						},
						{
							explanation:
								'ETH ABI repository provides curated ABI database for Keycard Shell transaction decoding',
							url: 'https://github.com/keycard-tech/eth-abi-repo',
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.NOT_PROVIDED,
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
			// Self-sovereignty: Uses open standards (ERC-4527, BC-UR) and integrable permissionlessly
			interoperability: {
				type: InteroperabilityType.PASS,
				details:
					'Uses open QR standards (ERC-4527 for EVM, BC-UR for Bitcoin); works with multiple independent wallets without vendor lock-in',
				// Designed for permissionless integration via open QR standards
				interoperability: InteroperabilityType.PASS,
				// No account registration with manufacturer required
				noSupplierLinkage: InteroperabilityType.PASS,
				url: 'https://keycard.tech/blog/announcing-keycard-shell',
			},
		},
		transparency: {
			maintenance: {
				// The enclosure is described as "dust resistant"; no drop or water rating and no MTBF data.
				// Source: https://docs.keycard.tech/en/developers/hardware-specification
				// "Removable BL-4C, about $3, sold worldwide. No tools."
				// Source: https://keycard.tech/products/keycard-shell
				// Two-year guarantee against defects in materials and workmanship (EU terms); no extension offered.
				// Source: https://keycard.tech/pages/european-guarantee-terms
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.PASS,
				details:
					'User-replaceable commodity battery; two-year guarantee without extension; no durability ratings, MTBF data or repair service.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://keycard.tech/pages/european-guarantee-terms',
				warrantyExtensions: MaintenanceType.PARTIAL,
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
				// In-house design built on an STM32 MCU and NXP smart card; the Keycard card applet dates from 2018, the Shell shipped firmware v1.0.0 in October 2025 and v1.4.0 in September 2026.
				// Source: https://github.com/keycard-tech/keycard-shell/releases
				// Backed by Status (founded 2017), part of the Institute of Free Technology.
				// Source: https://free.technology
				// No security advisories, disclosed vulnerabilities or published security contact.
				// Source: https://github.com/keycard-tech/keycard-shell/security
				// No bug bounty covering Keycard.
				// Source: https://hackenproof.com/company/ift/programs
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.FAIL,
				details:
					'Original open design with regular firmware releases, backed by an organization operating since 2017; no vulnerability disclosure channel or advisories; no bug bounty.',
				disclosureHistory: ReputationType.FAIL,
				originalProduct: ReputationType.PASS,
				url: 'https://github.com/keycard-tech/keycard-shell',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
