import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
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
	DataDisplayOptions,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { slowMist } from '../entities/slowmist'

export const onekeyWallet: HardwareWallet = {
	metadata: {
		id: 'onekey',
		displayName: 'OneKey Pro',
		tableName: 'OneKey Pro',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'onekey-pro',
				name: 'OneKey Pro',
				isFlagship: true,
				url: 'https://onekey.so/products/onekey-pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://developer.onekey.so/'],
			repositories: ['https://github.com/OneKeyHQ'],
			socials: {
				linkedin: 'https://www.linkedin.com/company/onekeyhq',
				x: 'https://x.com/OneKeyHQ',
			},
			websites: ['https://onekey.so/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			// Signing is limited to registered delegation contracts (OKX, MetaMask, Simple7702 and the revoke address) and to self-sponsored transactions.
			// Source: https://github.com/OneKeyHQ/firmware-pro/blob/main/core/src/apps/ethereum/onekey/sign_tx_eip7702.py
			eip7702: supported({
				ref: [
					{
						explanation:
							'Firmware v4.16.0 (2025-09-15) "Added support for EIP-7702 transaction signing".',
						url: 'https://github.com/OneKeyHQ/firmware-pro/releases/tag/v4.16.0',
					},
				],
				contract: 'UNKNOWN',
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"Ethereum accounts use the BIP-44 path m/44'/60'/0'/0/i by default from a BIP-39 seed; Ledger Live style paths are also accepted.",
						url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/core/src/apps/ethereum/keychain.py',
					},
					{
						explanation:
							'"For security reasons, the recovery phrases of OneKey hardware wallets cannot be viewed and exported after the initial setup."',
						url: 'https://help.onekey.so/en/articles/11461156',
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
			ref: [
				'https://help.onekey.so/en/articles/11461105-how-to-use-rabby-wallet-with-onekey-hardware-wallets',
				'https://developer.onekey.so/connect-to-software/using-walletconnect',
			],
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
							'OneKey Pro firmware: "core - GPLv3 ... crypto - mostly MIT ... all other files - GPLv3". The secure element firmware is not published.',
						url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/LICENSE.md',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'OneKey Secures Series B Funding at $150M Valuation, Led by YZi Labs',
					url: 'https://onekey.so/blog/updates/onekey-secures-series-b-funding/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
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
			privacyPolicy: 'https://help.onekey.so/hc/en-us/articles/360002003315-Privacy-Policy',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash code in the firmware Ethereum app, and no private transfer mode in the OneKey App docs.
				// Source: https://github.com/OneKeyHQ/firmware-pro/tree/main/core/src/apps/ethereum
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
				// Hardware backups are user-held: recovery phrase, SLIP-39 shares, or an encrypted copy on a OneKey Lite card. OneKey's vendor-assisted "Keyless" recovery is for separate software wallets only.
				// Source: https://help.onekey.so/en/articles/13348049
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'OneKey bug bounty policy: reports by email or BugRap; firmware rewards from $0 to $5,000 by severity, with a quality multiplier.',
						url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/SECURITY.md',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-04-20' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'"OneKey will not pursue legal action against researchers who: Act in good faith and comply with this program\'s rules".',
							url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/SECURITY.md',
						},
					],
				}),
				platform: BugBountyPlatform.BUGRAP,
				rewards: supported({
					ref: [
						{
							explanation:
								'Reward tables in USD: firmware Critical $3,000-5,000, High $1,000-3,000, Medium $100-1,000, Low $0-100; app, SDK and website tiers are lower.',
							url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/SECURITY.md',
						},
					],
					currency: 'USD',
					maximum: 5000,
					minimum: 0,
				}),
				upgradePathAvailable: false,
			}),
			duressResistance: null,
			firmware: {
				// The bootloader requires 4 of 7 OneKey signatures, asks "Install firmware by OneKey?" on the device, and refuses downgrades ("Firmware downgrade not allowed!").
				// Source: https://github.com/OneKeyHQ/firmware-pro/blob/main/core/embed/emmc_wrapper/emmc_commands.c
				// MCU firmware is GPLv3, but the secure element firmware is closed (chip vendor IP) and a prebuilt fingerprint library is linked in.
				// Source: https://github.com/OneKeyHQ/firmware-pro/blob/main/LICENSE.md
				// OneKey documents a reproducible build of the MCU image (Nix, tag v4.14.0); WalletScrutiny still lists the Pro as source-available, not reproducible.
				// Source: https://help.onekey.so/en/articles/12025839
				// Source: https://walletscrutiny.com/hardware/onekey.pro/
				// Only images signed by OneKey keys are accepted; there is no third-party firmware path.
				// Source: https://github.com/OneKeyHQ/firmware-pro/blob/main/core/embed/bootloader/main.c
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.FAIL,
				details:
					'Signed updates with on-device confirmation and downgrade protection; open-source MCU firmware with a closed secure element firmware; vendor-documented reproducible build not yet independently confirmed; no custom firmware.',
				firmwareOpenSource: FirmwareType.PARTIAL,
				reproducibleBuilds: FirmwareType.PARTIAL,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://help.onekey.so/en/articles/12025839',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'On-device wallet creation takes 32 bytes from the secure element random number generator (optionally mixed with the MCU generator); no host entropy is requested in that flow.',
						url: 'https://github.com/OneKeyHQ/firmware-pro/blob/main/core/src/apps/management/reset_device/__init__.py',
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
							explanation: 'OneKey Pro security audit by SlowMist',
							url: 'https://github.com/slowmist/Knowledge-Base/blob/49f4b9fce925d988b7d291bb0b97d0b6aac5f44f/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20OneKey%20Pro_en-us.pdf',
						},
					],
					auditDate: '2024-10-21',
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
							'Built with an EAL 6+ Secure Element, the same level of chip security used in government IDs, passports, and EMV bank cards.',
						url: 'https://onekey.so/products/onekey-classic-1s-hardware-wallet/',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// No published documentation or audit of manufacturing or key provisioning. The manufacturing partner holds ISO 9001 (quality, not security); OneKey's ISO 27001 announcement gives no scope.
				// Source: https://onekey.so/blog/ecosystem/onekey-passes-iso-9001-quality-management-system-certification/
				// "The device has a holographic anti-tamper seal... Peeling off the holographic anti-tamper seal will leave obvious marks"; the box has a self-destruct label.
				// Source: https://help.onekey.so/en/articles/11461083-authenticate-onekey-pro
				// Published schematics cover only 2020-era boards, not the Pro.
				// Source: https://github.com/OneKeyHQ/firmware-classic1s/tree/master/docs/pcb
				// "Built with 4 EAL 6+ Secure Elements"; "Auto-wipe if intrusion is detected, such as firmware modification."
				// Source: https://onekey.so/products/onekey-pro-hardware-wallet/
				// The SDK sends a challenge signed by a secure element certificate to OneKey's verification service, but OneKey's blog says device verification checks the serial number and "does not interact with the secure chip".
				// Source: https://github.com/OneKeyHQ/hardware-js-sdk/blob/onekey/packages/core/src/api/device/DeviceVerify.ts
				// Source: https://onekey.so/blog/ecosystem/anti-counterfeiting-verification-of-onekey-devices/
				type: SupplyChainFactoryType.FAIL,
				details:
					'No factory security documentation or audit; holographic anti-tamper seal; no published schematics for the Pro; four certified secure elements with auto-wipe; device verification whose mechanism is described inconsistently.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.PARTIAL,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://help.onekey.so/en/articles/11461083-authenticate-onekey-pro',
			},
			transactionLegibility: {
				ref: [
					{
						explanation: "Independent video showing OneKey Pro's transaction details",
						url: 'https://youtube.com/shorts/J_XG7cNOVhM',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					...displaysFullTransactionDetails,
					chain: DataDisplayOptions.NOT_IN_UI,
					nonce: DataDisplayOptions.NOT_IN_UI,
				},
				erc4361: null,
				erc7730: notSupportedWithRef({
					ref: {
						explanation:
							"Independent video demonstration of OneKey Pro's signing implementation with a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1958',
					},
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
				// "All products come with a one-year warranty from the date of purchase"; a defective device is replaced with a new one. No extension offered.
				// Source: https://help.onekey.so/en/articles/11461245-shipping-returns-policy
				// The Pro has a 530 mAh lithium battery rated for at least 500 cycles; no replacement path is documented. No drop, water or MTBF figures.
				// Source: https://onekey.so/products/onekey-pro-hardware-wallet/
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'One-year warranty with replacement of defective units and no extension; no durability ratings, MTBF data or battery replacement path.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://help.onekey.so/en/articles/11461245-shipping-returns-policy',
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
				// In-house hardware design on firmware forked from Trezor's open-source code; secure elements from a third-party chip vendor.
				// Source: https://github.com/OneKeyHQ/firmware-pro
				// Discontinued models keep support: Mini feature updates ended June 2025, with security patches promised to continue.
				// Source: https://help.onekey.so/hc/en-us/articles/8934154578831-Get-started-with-OneKey-Mini
				// CVE-2023-25758 (Touch and Mini secure element bus, found by an outside research firm) was acknowledged and fixed, but OneKey has no security advisory page or GitHub advisories.
				// Source: https://nvd.nist.gov/vuln/detail/CVE-2023-25758
				// Bug bounty with published reward tables and safe harbor.
				// Source: https://github.com/OneKeyHQ/firmware-pro/blob/main/SECURITY.md
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PASS,
				details:
					'In-house hardware on a Trezor-derived firmware base; continued security support for discontinued models; vulnerabilities fixed but without an advisory channel; bug bounty with published rewards and safe harbor.',
				disclosureHistory: ReputationType.PARTIAL,
				originalProduct: ReputationType.PARTIAL,
				url: 'https://github.com/OneKeyHQ/firmware-pro',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
