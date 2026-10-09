import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
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
} from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { keylabs } from '../entities/keylabs'

export const cypherockWallet: HardwareWallet = {
	metadata: {
		id: 'cypherock',
		displayName: 'Cypherock Wallet',
		tableName: 'Cypherock',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'cypherock-x1',
				name: 'Cypherock X1',
				isFlagship: true,
				url: 'https://www.cypherock.com/product/cypherock-x1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://docs.cypherock.com/'],
			repositories: ['https://github.com/Cypherock'],
			socials: {
				facebook: 'https://facebook.com/cypherock/',
				instagram: 'https://www.instagram.com/cypherockwallet/',
				linkedin: 'https://www.linkedin.com/company/cypherockwallet/',
				telegram: 'https://t.me/cypherock',
				x: 'https://x.com/CypherockWallet',
			},
			websites: ['https://www.cypherock.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'The EVM app decodes only transaction types 0, 1 and 2; any other type is rejected as unknown, and message signing covers only eth_sign, personal_sign and EIP-712.',
						url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/apps/evm_family/evm_txn_helpers.c',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"New wallets get a 24-word BIP-39 seed; Ethereum accounts use BIP-44 paths such as `m/44'/60'/0'/0/i`.",
						url: 'https://docs.cypherock.com/design-decisions/cypherock-is-bip39-compliant',
					},
					{
						explanation:
							'The seed phrase can be viewed again with the X1 Vault, one X1 Card and the PIN.',
						url: 'https://docs.cypherock.com/getting-started/how-do-i-know-i-am-not-locked-in-to-using-only-cypherock-x1',
					},
				],
				canExportPrivateKey: false,
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
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://www.youtube.com/watch?v=R0g35dKjRtI',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'X1 Vault application firmware is published under MIT with the Commons Clause, which forbids selling the software.',
						url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/3542eeae9f4455bec107fe0f02230453719706a6/LICENSE.md',
					},
				],
				license: FOSSLicense.MIT_WITH_CLAUSE,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Hardware wallet startup Cypherock raises $1 million',
					url: 'https://entrackr.com/2022/12/hardware-wallet-startup-cypherock-raises-1-mn/',
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
			privacyPolicy: 'https://www.cypherock.com/privacy',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash support in the firmware or cySync; transfers are standard public transfers.
				// Source: https://www.cypherock.com/cysync
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			// Left null: Cypherock Cover is a paid vendor service that stores the wallet PIN and nominee messages, encrypted by an X1 Card, on Cypherock's server and releases them to nominees after inactivity. Nominees still need two X1 Cards (or one card and the Vault). The guardian types don't model this; needs a maintainer decision.
			// Source: https://www.cypherock.com/estate-recovery
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Cypherock has a 90-day disclosure policy, which means that we do our best to fix issues within 90 days upon receipt of a vulnerability report. If the issue is fixed sooner and if there is a mutual agreement between the security researcher and the Cypherock Security Team, the disclosure might happen before the 90-day deadline.',
						url: 'https://www.cypherock.com/bug-bounty',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-03-22' as const,
				disclosure: supported({
					numberOfDays: 90,
				}),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Cypherock commits that security researchers reporting bugs will be protected from legal liability, so long as they follow responsible disclosure guidelines and principles.',
							url: 'https://www.cypherock.com/bug-bounty',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			firmware: {
				// Updates need on-device confirmation, two of four vendor signatures, and refuse lower versions.
				// Source: https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/docs/bootloader.md
				// The application firmware is source-available (MIT with Commons Clause); the bootloader and the X1 Card applet are closed.
				// Source: https://docs.cypherock.com/cypherock-x1-features/open-source-with-secure-elements
				// Reproducible builds are documented, and WalletScrutiny rated releases reproducible up to v0.6.1282 (2024-12-10).
				// Source: https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/VERIFY.md
				// Unsigned firmware is rejected and wiped; locally built images can't be installed.
				// Source: https://docs.cypherock.com/security-overview/physical-attacks/flashing-malicious-firmware
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.FAIL,
				details:
					'Signed updates with on-device confirmation and downgrade protection; source-available application firmware with closed bootloader and card applet; documented reproducible builds; no custom firmware.',
				firmwareOpenSource: FirmwareType.PARTIAL,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/docs/bootloader.md',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Entropy from the main chip and the secure element random number generators is combined on the X1 Vault; the seed is split into 2-of-5 Shamir shares (Vault plus four X1 Cards) and rebuilt on the Vault for signing.',
						url: 'https://docs.cypherock.com/getting-started/how-cypherock-generates-your-24-word-seed-phrase',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.ON_USER_DEVICE,
			},
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation: 'Public Response to KeyLabs Audit of Cypherock',
							url: 'https://www.cypherock.com/keylabs.pdf',
						},
					],
					auditDate: '2022-09-30',
					auditor: keylabs,
					codeSnapshot: {
						date: '2022-09-30',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
			],
			secureElement: supported({
				ref: [
					{
						explanation:
							'X1 Vault is open source and stores 1 of the 5 shards and the 4 X1 Cards have EAL 6+ secure elements and store the remaining 4 of the 5 shards.',
						url: 'https://docs.cypherock.com/security-overview/introduction',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// Device provisioning (key derivation, secure element configuration, server registration of device public keys) is documented; factory physical security is not.
				// Source: https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/docs/device_provision_auth.md
				// The Keylabs audit covered architecture, hardware and firmware, not manufacturing.
				// Source: https://www.cypherock.com/keylabs.pdf
				// The ultrasonically welded enclosure shows marks if forced open; Cypherock rejects tamper tapes and stickers.
				// Source: https://docs.cypherock.com/security-overview/introduction
				// No schematics, PCB files or BOM are published.
				// Source: https://github.com/Cypherock
				// The Vault has no tamper-response circuitry (Keylabs: "Device Lacks Tamper Resistance and Tamper Circuitry", Low); key shares on the X1 Cards are in secure elements.
				// Source: https://www.cypherock.com/keylabs.pdf
				// Server-side attestation of Vault and Cards with optional email confirmation; a 2025 security researcher write-up reports the check can be spoofed after compromising the device.
				// Source: https://www.darknavy.org/blog/how_and_why_we_hacked_cypherock_hardware_wallet_the_full_story/
				type: SupplyChainFactoryType.FAIL,
				details:
					'Provisioning documented but no factory audit; welded enclosure without packaging seals; no published hardware design; no tamper circuitry on the Vault but key shares on secure element cards; server attestation with a reported bypass.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.PARTIAL,
				genuineCheck: SupplyChainFactoryType.PARTIAL,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.PARTIAL,
				tamperResistance: SupplyChainFactoryType.PARTIAL,
				url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/5b11739d5a3e4c47181cdc28dbe168a97847db45/docs/device_provision_auth.md',
			},
			transactionLegibility: {
				ref: [
					{
						explanation:
							"Independent video demonstration of Cypherock's transaction implementation.",
						url: 'https://youtube.com/shorts/YG6lzwTUojE',
					},
				],

				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					chain: DataDisplayOptions.NOT_IN_UI,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT, // derivation path counts
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT, // tx fee
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT, // contract address
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				erc4361: null,
				erc7730: notSupportedWithRef({
					ref: {
						explanation: "Independent video demonstration of Cypherock's signing implementation.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=534',
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
				// Warranty "lasts for one (1) year"; Cypherock will "repair, or based on its discretion replace a defective product". Standard and Pro editions are sold with a 3-year warranty.
				// Source: https://www.cypherock.com/cancellation-and-replacement-policy
				// Source: https://www.cypherock.com/blogs/cypherock-x1-models-comparison
				// No battery: the Vault is powered over USB. Spare Vaults and card sets are sold. No durability or MTBF data.
				// Source: https://www.cypherock.com/faq
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.PASS,
				details:
					'No battery; spare Vaults and cards sold; one-year warranty (three years on higher editions); no durability ratings or MTBF data.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://www.cypherock.com/cancellation-and-replacement-policy',
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
				// In-house design and firmware on off-the-shelf chips; founded 2019; X1 released April 2022 and still updated in 2026.
				// Source: https://walletscrutiny.com/hardware/cypherockx1/
				// Security researchers reported firmware vulnerabilities, demonstrated live in 2025, and say Cypherock patched silently without acknowledgement; no advisory or CVE was published.
				// Source: https://www.darknavy.org/blog/how_and_why_we_hacked_cypherock_hardware_wallet_the_full_story/
				// Bug bounty with safe harbor and a 90-day disclosure policy, but no published reward amounts.
				// Source: https://www.cypherock.com/bug-bounty
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original design on the market since 2022 with active updates; reported vulnerabilities fixed without advisories; bug bounty without published reward amounts.',
				disclosureHistory: ReputationType.FAIL,
				originalProduct: ReputationType.PASS,
				url: 'https://www.cypherock.com/bug-bounty',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
