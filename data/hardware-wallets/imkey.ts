import { mako } from '@/data/contributors/mako'
import { minimalsm } from '@/data/contributors/minimalsm'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	DataDisplayOptions,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const imkeyWallet: HardwareWallet = {
	metadata: {
		id: 'imkey',
		displayName: 'imKey',
		tableName: 'imKey',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [mako, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'imkey-pro',
				name: 'imKey Pro',
				isFlagship: true,
				url: 'https://imkey.im/products/imkey-pro-crypto-hardware-wallet',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			repositories: ['https://github.com/consenlabs/imkey-core'],
			websites: ['https://imkey.im/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'imToken, the companion app, states it does not currently support triggering EIP-7702 authorizations; the imKey Ethereum applet release notes end at v1.5.01 (2023) with EIP-1559 as the newest transaction type.',
						url: 'https://support.token.im/hc/zh-cn/articles/48281132711705',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							'Wallets use a BIP-39 recovery phrase (12 words when created; 12, 18 or 24 words when restored) entered only on the device.',
						url: 'https://support.imkey.im/hc/en-001/articles/62746797674009',
					},
					{
						explanation:
							'BIP-44 derivation paths are supported, including custom account, change, and index values.',
						url: 'https://support.imkey.im/hc/en-001/articles/36697124453657',
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
		appConnectionSupport: null,
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: [
					{
						explanation: 'Core components are open-sourced under Apache-2.0 on GitHub.',
						url: 'https://github.com/consenlabs/imkey-core',
					},
				],
				license: FOSSLicense.APACHE_2_0,
			},
			walletAppLicense: {
				[Variant.HARDWARE]: {
					ref: [
						{
							explanation:
								'"Not all imKey firmware is open source. Users and independent researchers therefore cannot inspect the full codebase or independently reproduce production firmware".',
							url: 'https://support.imkey.im/hc/en-001/articles/62143753099929',
						},
					],
					license: SourceNotAvailableLicense.PROPRIETARY,
				},
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'imKey Pro is a one-time hardware purchase with no subscription or custodial service fees. Transactions incur only standard onchain gas fees.',
					url: 'https://imkey.im/products/imkey-pro-crypto-hardware-wallet',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: null,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: {
				type: HardwarePrivacyType.PASS,
				details:
					'Private keys are generated and stored within the secure element (EAL6+); no export capability.',
				inspectableRemoteCalls: HardwarePrivacyType.PASS,
				phoningHome: HardwarePrivacyType.PASS,
				wirelessPrivacy: HardwarePrivacyType.PASS,
			},
			privacyPolicy: 'https://token.im/tos-en.html',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash support is documented for imKey or imToken; transfers are standard public transfers.
				// Source: https://support.imkey.im/hc/en-001/articles/52922578271001
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
				// imKey "does not provide any virtual asset trading, custody, or funds-related services"; recovery is only from the user's own recovery phrase.
				// Source: https://support.imkey.im/hc/en-001/articles/52841638585881
				guardianRecovery: notSupported,
			},
			// dateStarted is the creation date of the program article; no earlier start date was found.
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'imKey Vulnerability and Threat Intelligence Bounty Program: website, SDK repository and device in scope; reports to support@imkey.im; rewards from $10 (Low) to $10,000 (Critical) in USDT or USDC.',
						url: 'https://support.imkey.im/hc/en-001/articles/52956224536345',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2025-12-02' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: supported({
					ref: [
						{
							explanation:
								'Reward tiers: Critical $5,000–10,000, High $1,000–5,000, Medium $500–1,000, Low $10–500.',
							url: 'https://support.imkey.im/hc/en-001/articles/52956224536345',
						},
					],
					currency: 'USDT',
					maximum: 10000,
					minimum: 10,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			firmware: {
				// Only applets signed with keys provisioned into the secure element can be installed, and firmware updates come only from imKey's update server.
				// Source: https://support.imkey.im/hc/en-001/articles/52780277095577
				// Production firmware cannot be rebuilt: "Not all imKey firmware is open source ... cannot ... independently reproduce production firmware". WalletScrutiny: "Build cannot be done because the source code is not publicly available."
				// Source: https://support.imkey.im/hc/en-001/articles/62143753099929
				// Source: https://walletscrutiny.com/hardware/imkeypro/
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.FAIL,
				details:
					'All firmware updates are distributed via imKey Manager and must pass digital signature checks. Updates require explicit user confirmation and cannot be installed silently.',
				firmwareOpenSource: FirmwareType.PARTIAL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://support.imkey.im/hc/en-001/articles/36709320202649',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The secure element generates the key with its hardware true random number generator, and "The phone or general-purpose host system neither generates the wallet\'s initial entropy".',
						url: 'https://support.imkey.im/hc/en-001/articles/62143753099929',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: { ethereumL1: null },
			publicSecurityAudits: null,
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// Factory provisioning is described only briefly: "Public keys are securely inserted during initialization; Data is injected with cryptographic signatures". A KnownSec audit is cited, but its scope is product security, not manufacturing, and no report link is given.
				// Source: https://support.imkey.im/hc/en-001/articles/52780277095577
				// No schematics, PCB files or BOM are published; only the host-side SDK is open source.
				// Source: https://walletscrutiny.com/hardware/imkeypro/
				// Shrink-wrap plus tamper-evident seals on both sides of the box.
				// Source: https://support.imkey.im/hc/en-001/articles/52836113707929
				type: SupplyChainFactoryType.PARTIAL,
				details:
					'Manufactured with QA and serial verification; tamper-evident packaging and official-channel logistics mitigate supply chain attacks. Verification: https://imkey.im/pages/sn-check, https://learn.imkey.im/hc/en-001/articles/42589035963417',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.PARTIAL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://imkey.im/pages/verify',
			},

			transactionLegibility: {
				ref: [
					{
						explanation:
							'imKey interacts seamlessly with apps through the imToken in-app browser and supports connection via Rabby or WalletConnect.',
						url: [
							'https://imkey.im/pages/integrated-wallets',
							'https://learn.imkey.im/hc/en-001/articles/35683788822937',
						],
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					...displaysFullTransactionDetails,
					nonce: DataDisplayOptions.NOT_IN_UI,
				},
				erc4361: null,
				erc7730: notSupportedWithRef({ ref: refTodo }),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: {
				type: InteroperabilityType.PASS,
				details:
					'Compatible with imToken mobile (Bluetooth) and Rabby browser extension (USB). See also: https://learn.imkey.im/hc/en-001/articles/35683788822937',
				interoperability: InteroperabilityType.PASS,
				noSupplierLinkage: InteroperabilityType.PASS,
				url: 'https://imkey.im/pages/integrated-wallets',
			},
		},
		transparency: {
			maintenance: {
				// One-year warranty "from the date of receipt"; "imKey provides a 'Replacement Only' service for valid warranty claims. We do not perform hardware repairs". No extension offered.
				// Source: https://support.imkey.im/hc/en-001/articles/37832707276953
				// 33 mAh lithium polymer battery; replaceability is not documented. No drop, water or MTBF data.
				// Source: https://imkey.im/products/imkey-pro-crypto-hardware-wallet
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'One-year warranty with replacement only and no extension; no durability ratings, MTBF data or battery replacement path.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://support.imkey.im/hc/en-001/articles/37832707276953',
				warrantyExtensions: MaintenanceType.FAIL,
			},
			operationFees: {
				builtInErc20Swap: notSupported,
				erc20L1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: notSupported,
			},
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
				// Co-developed with an independent security firm, which "provides architecture design, hardware customization, and secure code reviews"; secure element from an external vendor.
				// Source: https://support.imkey.im/hc/en-001/articles/52780277095577
				// Company founded 2018; imKey Pro released 2020; the latest firmware (COS v1.9.05) is from August 2024.
				// Source: https://support.imkey.im/hc/en-001/articles/52925909789337
				// No disclosed vulnerabilities or advisory page; public statements on industry issues (a 2024 secure element side-channel attack).
				// Source: https://support.imkey.im/hc/en-001/articles/52801755830681
				// Bug bounty with published reward tiers but no safe harbor.
				// Source: https://support.imkey.im/hc/en-001/articles/52956224536345
				type: ReputationType.FAIL,
				availability: ReputationType.PARTIAL,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Co-developed with an independent security firm; no firmware release since August 2024; no vulnerability disclosures or advisories; bug bounty with published rewards but no safe harbor.',
				disclosureHistory: ReputationType.PARTIAL,
				originalProduct: ReputationType.PARTIAL,
				url: 'https://support.imkey.im/hc/en-001/articles/52780277095577',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: { [Variant.HARDWARE]: true },
}
