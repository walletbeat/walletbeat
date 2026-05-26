import { mmlado } from '@/data/contributors/mmlado'
import { phift } from '@/data/contributors/phift'
import {
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BasicUnlockMechanism, DuressAction } from '@/schema/features/security/duress-resistance'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { SupplyChainDIYType } from '@/schema/features/security/supply-chain-diy'
import {
	BasicBenchmarkTransactions,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataExtraction,
	DataLocation,
	noCalldataDecoding,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const keycardShell: HardwareWallet = {
	metadata: {
		id: 'keycard-shell',
		displayName: 'Keycard Shell',
		tableName: 'Keycard Shell',
		blurb: paragraph(`
			Keycard Shell is a modular, fully open-source, air-gapped hardware wallet that signs
			via QR codes (ERC-4527). It has a built-in keypad, display, and camera, optional USB
			(can be turned off), and uses removable Keycards for secure key storage and backups.
			Keycard is a BIP-32 HD wallet running on JavaCard with EAL6+ secure element. Supports
			BIP-39 and SLIP-39 seed phrases.
		`),
		contributors: [phift, mmlado],
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
		lastUpdated: '2026-05-02',
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
		accountSupport: null,
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
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: {
				basicUnlock: {
					ref: [
						'https://github.com/keycard-tech/keycard-shell/blob/b25a5f8149990d5bef3c86355b3e60281427c90d/app/keycard/keycard.c#L240',
						'https://docs.keycard.tech/duress_pin',
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: true,
						[BasicUnlockMechanism.PASSWORD]: false,
						[BasicUnlockMechanism.BIOMETRIC]: false,
						[BasicUnlockMechanism.PATTERN]: false,
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
				customFirmware: null,
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
			publicSecurityAudits: null, // Security: EAL6+ certified JavaCard secure element (on the Keycard smartcard)
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
			supplyChainFactory: null,
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
							'Product page emphasizes human-readable transaction data and verifying tx data on-device display',
						url: 'https://get.keycard.tech/pages/keycard-shell',
					},
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
				calldataDecoded: {
					...noCalldataDecoding,
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
				},
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
