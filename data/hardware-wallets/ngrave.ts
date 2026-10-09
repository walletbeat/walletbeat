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
	noDataExtraction,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const ngrave: HardwareWallet = {
	metadata: {
		id: 'ngrave',
		displayName: 'NGRAVE Zero',
		tableName: 'NGRAVE',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'ngrave-zero',
				name: 'NGRAVE Zero',
				isFlagship: true,
				url: 'https://ngrave.io/zero',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			socials: {
				discord: 'https://discord.com/invite/gapxmWEBNJ',
				facebook: 'https://web.facebook.com/ngrave.io/',
				instagram: 'https://www.instagram.com/ngrave.io/',
				linkedin: 'https://www.linkedin.com/company/ngrave/',
				x: 'https://x.com/ngrave_official',
			},
			websites: ['https://ngrave.io/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			// No EIP-7702 support in any release notes up to v1.8 (August 2026) or on the roadmap; EIP-712 typed data signing is still listed as in progress.
			// Source: https://ngrave.io/en/roadmap
			eip7702: notSupported,
			eoa: supported({
				ref: [
					{
						explanation:
							"ZERO uses standard BIP-44 paths (Ethereum m/44'/60'/0'/0/0); its 256-bit \"Perfect Key\" is BIP-39 entropy and can be shown as 24 words.",
						url: 'https://support.ngrave.io/hc/en-us/articles/4409554559889',
					},
					{
						explanation:
							'The secret can be shown again on the device: "Go to Settings → Display secret key, enter your PIN code and then select Mnemonic or NGRAVE wallet." Only extended public keys are exported to the LIQUID app.',
						url: 'https://support.ngrave.io/hc/en-us/articles/4409561273745',
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
			ref: 'https://support.ngrave.io/hc/en-us/articles/20045312764701-How-to-stay-safe-on-web3',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'NGRAVE is not open source',
						url: 'https://youtu.be/-m1jcBFS0dc?t=701',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Crypto hardware wallet NGRAVE raises $6M seed round',
					url: 'https://ngrave.io/en/crypto-hardware-wallet-ngrave-raises-6m-seed-round',
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
				// Buying crypto in LIQUID adds a 1% NGRAVE fee, shown in the cost breakdown before confirming.
				// Source: https://support.ngrave.io/hc/en-us/articles/21366533953309
				transparentConvenienceFees: true,
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
			privacyPolicy: 'https://ngrave.io/privacy-policy',
			transactionPrivacy: {
				// LIQUID offers plain send and receive; no private transfer feature is documented.
				// Source: https://ngrave.io/en/liquid
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
				// Recovery uses the user's own backup. NGRAVE's paid steel-plate backup service can recreate the upper plate from the user's code, but "the bottom plate cannot be recovered by NGRAVE", so NGRAVE cannot recover the key.
				// Source: https://support.ngrave.io/hc/en-us/articles/10218274599325
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							"NGRAVE runs a bug bounty for its hardware wallet and web services, with reports to security@ngrave.io; awards are at NGRAVE's discretion with no published amounts.",
						url: 'https://ngrave.io/en/bug-bounty-program',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2025-01-18' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'We ensure that security researchers who follow our guidelines are protected from legal action and are acknowledged for their contributions.',
							url: 'https://ngrave.io/en/bug-bounty-program',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			duressResistance: null,
			firmware: {
				// "The update will only be installed if it is signed by NGRAVE." Updates need the device to be put into update mode, and "it is not possible to downgrade the firmware".
				// Source: https://support.ngrave.io/hc/en-us/articles/9709388172061
				// Source: https://support.ngrave.io/hc/en-us/articles/9709351076381
				// No firmware source is published; NGRAVE says the secure element and secure OS will stay closed. WalletScrutiny found no source to review.
				// Source: https://ngrave.io/en/blog/post/how-is-ngrave-protecting-its-users
				// Source: https://walletscrutiny.com/hardware/ngravezero/
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.FAIL,
				details:
					'Signed updates installed only in a user-started update mode, with downgrade protection; closed-source firmware that cannot be rebuilt; no custom firmware.',
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://support.ngrave.io/hc/en-us/articles/9709388172061',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							"The key is generated on the air-gapped ZERO from the chip random number generator combined with the user's fingerprint, and the user can change parts of it; ZERO has no data link to a computer.",
						url: 'https://support.ngrave.io/hc/en-us/articles/4409564979089',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			// No public audit report of NGRAVE's firmware or device found (vendor site, help center, GitHub, WalletScrutiny, web search). The EAL7 certificate belongs to the secure OS from an external vendor that NGRAVE embeds, and EAL5+ to the secure element chip.
			// Source: https://ngrave.io/en/blog/the-vision-of-open-source-from-our-cto
			publicSecurityAudits: [],
			secureElement: supported({
				ref: [
					{
						explanation: 'The only crypto hardware wallet that achieved EAL7 certification.',
						url: 'https://ngrave.io/en/zero',
					},
				],
				secureElementType: SecureElementType.EAL_7,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// The only manufacturing statement is that ZERO is built in Belgium; no provisioning or factory security documentation or audit.
				// Source: https://ngrave.io/en/zero
				// No packaging seals: NGRAVE relies on attestation, which it calls "a better guarantee than tamper-evident seals on the packaging"; the one-piece metal casing cannot be reassembled without traces.
				// Source: https://ngrave.io/en/blog/post/how-is-ngrave-protecting-its-users
				// No schematics, PCB files or BOM are published.
				// Source: https://github.com/ngraveio
				// Processor with active tamper detection plus a secure element; "There are sensors inside the ZERO which will detect it being opened and will wipe/reset the device."
				// Source: https://support.ngrave.io/hc/en-us/articles/4409554458001
				// First boot asks the user to scan a QR challenge from NGRAVE's website, answered with a device-unique key.
				// Source: https://support.ngrave.io/hc/en-us/articles/4409561382545
				type: SupplyChainFactoryType.FAIL,
				details:
					'No factory security documentation or audit; tamper-evident casing but no packaging seals; no published hardware design; opening sensors that wipe the device; cryptographic attestation at first boot.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.PARTIAL,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://support.ngrave.io/hc/en-us/articles/4409561382545',
			},
			transactionLegibility: {
				ref: refTodo,
				dataExtraction: noDataExtraction,
				detailsDisplayed: {
					chain: DataDisplayOptions.NOT_IN_UI,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				erc4361: null,
				erc7730: notSupportedWithRef({
					ref: {
						explanation: 'Independent video demonstration of NGRAVE Zero signing issues',
						url: 'https://youtu.be/-m1jcBFS0dc?t=701',
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
				// "The ZERO is IP55-certified and is resistant to water and dust." No drop rating or MTBF data.
				// Source: https://support.ngrave.io/hc/en-us/articles/4409554458001
				// "Can the battery be replaced? No." A device with a battery problem is replaced under the 2-year warranty; opening the device resets it.
				// Source: https://support.ngrave.io/hc/en-us/articles/10743045500445
				// Two-year warranty (the EU statutory guarantee: repair or replacement); no extension offered.
				// Source: https://ngrave.io/en/terms-and-conditions
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'IP55 rating; no MTBF data; replacement rather than repair; non-replaceable battery; two-year warranty without extension.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.PASS,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://support.ngrave.io/hc/en-us/articles/10743045500445',
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
				// Founded in 2018; ZERO has shipped since 2021 with its own design, OS and key backup scheme, using ST chips and a secure OS from external vendors. Firmware v1.8 shipped in August 2026.
				// Source: https://ngrave.io/en/press/crypto-hardware-wallet-ngrave-raises-6m-seed-round
				// In January 2026 a group of investors acquired the company's core assets; the operator is now a new Belgian company.
				// Source: https://ngrave.io/en/terms-and-conditions
				// No security advisories or disclosed vulnerabilities; release notes mention only generic "security patches".
				// Source: https://ngrave.io/en/page/zero-release-notes-v1-1
				// Bug bounty with safe harbor but no published reward amounts.
				// Source: https://ngrave.io/en/bug-bounty-program
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original design on the market since 2021 with ongoing firmware updates; operating company restructured through an asset sale in 2026; no vulnerability disclosures or advisories; bug bounty without published reward amounts.',
				disclosureHistory: ReputationType.FAIL,
				originalProduct: ReputationType.PASS,
				url: 'https://ngrave.io/en/zero',
				warrantySupportRisk: ReputationType.PARTIAL,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
