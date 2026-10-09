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
} from '@/schema/features/security/bug-bounty-program'
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
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	DataDisplayOptions,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import type { WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const trezorWallet: HardwareWallet = {
	metadata: {
		id: 'trezor',
		displayName: 'Trezor Wallet',
		tableName: 'Trezor',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'trezor-safe-5',
				name: 'Trezor Safe 5',
				isFlagship: true,
				url: 'https://trezor.io/trezor-safe-5',
			},
			{
				id: 'trezor-safe-3',
				name: 'Trezor Safe 3',
				isFlagship: false,
				url: 'https://trezor.io/trezor-safe-3',
			},
			{
				id: 'trezor-model-one',
				name: 'Trezor Model One',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-one',
			},
			{
				id: 'trezor-model-t',
				name: 'Trezor Model T',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-t',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://trezor.io/learn'],
			repositories: ['https://github.com/trezor/trezor-suite'],
			socials: {
				instagram: 'https://www.instagram.com/trezor.io/',
				linkedin: 'https://www.linkedin.com/company/trezor/',
				reddit: 'https://www.reddit.com/r/TREZOR/',
				tiktok: 'https://www.tiktok.com/@trezor.io_official',
				x: 'https://x.com/trezor',
				youtube: 'https://www.youtube.com/@TrezorWallet',
			},
			websites: ['https://trezor.io/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'EIP-7702 authorization signing was added in core firmware 2.12.4 as an experimental feature. Experimental messages are rejected unless the user enables experimental features on the device, and delegates must be on a built-in allow list. It is not available by default and not on Model One.',
						url: 'https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/core/CHANGELOG.md',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"Ethereum accounts use BIP-44 derivation (m/44'/60'/0'/0/x) from a BIP-39 or SLIP-39 seed.",
						label: 'Trezor firmware Ethereum keychain',
						url: 'https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/core/src/apps/ethereum/keychain.py',
					},
					{
						explanation:
							'All Trezor models support 12- or 24-word BIP-39 backups; Model T and Safe models also support SLIP-39 Single-share and Multi-share backups.',
						url: 'https://trezor.io/learn/security-privacy/personal-security-standards/understanding-trezor-wallet-backups-12-20-or-24-words',
					},
					{
						explanation:
							'The device protocol has no message that exports a private key; the seed is only displayed on the device during backup.',
						label: 'Trezor firmware management messages',
						url: 'https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/common/protob/messages-management.proto',
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
				'https://trezor.io/guides/third-party-wallet-apps/third-party-wallet-apps-dapps',
				{
					explanation:
						'Trezor Connect only asks integrators for a manifest with an email address and app URL, which Trezor uses to identify the integration and contact the developer if necessary.',
					url: 'https://connect.trezor.io/10/methods/other/init/',
				},
				{
					explanation:
						'Network and token definitions shown on the device are generated from public token and network registries and signed by Trezor. Without a definition, the firmware still signs and shows an unknown network.',
					urls: [
						{
							label: 'External definitions',
							url: 'https://github.com/trezor/trezor-firmware/blob/b34ecf348dca3a2d2ebcd28241d8dcf8cf54803e/docs/common/external-definitions.md',
						},
						{
							label: 'Unknown network fallback',
							url: 'https://github.com/trezor/trezor-firmware/blob/b34ecf348dca3a2d2ebcd28241d8dcf8cf54803e/core/src/apps/ethereum/networks.py#L26-L31',
						},
					],
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
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The trezor-firmware repository is licensed per directory: `core` (the Model T and Safe firmware) is GPLv3, `legacy` (Model One) is LGPLv3, `crypto` is mostly MIT, and all other files are GPLv3.',
						url: 'https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/LICENSE.md',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'The Trezor CEO (2023): Trezor is "a notable crypto startup without outside investors" and "we don\'t want any venture money to tell us what\'s right for the user."',
					url: 'https://www.theblock.co/post/208854/trezor-ceo-matej-zak-plans',
				},
				{
					explanation:
						'Czech business register entry for Trezor Company (ID 02440032): owned by SatoshiLabs Group (82.5%) and four company managers; no investment funds among the holders.',
					label: 'Czech business register',
					url: 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-vr/02440032',
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
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: false,
			},
		},
		multiAddress: supported({
			ref: [
				{
					explanation:
						'On Ethereum and EVM networks, Trezor Suite lets users add accounts freely, and the device places no limit on the number of accounts.',
					url: 'https://trezor.io/guides/trezor-suite/trezor-suite-desktop/multiple-accounts-in-trezor-suite',
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
							'Trezor Safe 5 connects over USB-C and has no radio. Trezor Safe 7 adds Bluetooth, secured with the Trezor Host Protocol.',
						urls: [
							{ label: 'Trezor Safe 5', url: 'https://trezor.io/trezor-safe-5' },
							{ label: 'Trezor Safe 7', url: 'https://trezor.io/trezor-safe-7' },
						],
					},
					{
						explanation:
							'By default, Trezor Suite connects to backend servers run by Trezor; users can switch to their own backend server and route Suite through Tor.',
						urls: [
							{
								label: 'Connect Trezor Suite to your own node',
								url: 'https://trezor.io/guides/trezor-suite/connect-trezor-suite-to-your-own-node',
							},
							{
								label: 'Default Ethereum backend',
								url: 'https://github.com/trezor/trezor-suite/blob/3d661e0867210b9dc16a8f5c1c13b00bebd5a223/packages/connect-data/files/coins-eth.json#L2-L6',
							},
						],
					},
					{
						explanation:
							'Trezor Suite source code is public under the Trezor Reference Source License.',
						url: 'https://github.com/trezor/trezor-suite/blob/3d661e0867210b9dc16a8f5c1c13b00bebd5a223/LICENSE.md',
					},
				],
				details:
					'The Safe 5 has no radio and no network access of its own. Trezor Suite, whose source is public, uses Trezor-run servers by default and can be switched to a custom backend server and Tor.',
				inspectableRemoteCalls: HardwarePrivacyType.PASS,
				phoningHome: HardwarePrivacyType.PARTIAL,
				url: 'https://trezor.io/guides/trezor-suite/connect-trezor-suite-to-your-own-node',
				wirelessPrivacy: HardwarePrivacyType.PASS,
			}),
			privacyPolicy: 'https://trezor.io/privacy-policy',
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
				// No guardian, social or custodial recovery service is offered; backups (BIP-39 or
				// SLIP-39 Multi-share) are held by the user.
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Rewards up to $100,000 for core firmware ("In exceptionally critical cases, there is no upper reward limit"), $50,000 for Model One firmware and $20,000 for Trezor Suite. Coordinated disclosure, with up to three months to release a fix.',
						url: 'https://trezor.io/other/partner-portal/for-developers/bug-bounty-program',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2018-08-25' as const,
				disclosure: notSupported,
				// The program page sets rules for researchers ("Use exploits solely to verify the
				// existence of vulnerabilities") but contains no safe-harbor or legal-assurance language.
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: supported({
					currency: 'USD',
					maximum: 100000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								'Trezor recommends setting a PIN during setup; users who skip it can set one later in device settings.',
							url: 'https://trezor.io/guides/trezor-devices/trezor-fundamentals/pin-protection-on-trezor-devices',
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: supported({
							type: BasicUnlockMechanismSupport.OPTIONAL,
						}),
						[BasicUnlockMechanism.PASSWORD]: notSupported,
						[BasicUnlockMechanism.BIOMETRIC]: notSupported,
						[BasicUnlockMechanism.PATTERN]: notSupported,
					},
				},
				duressMode: supported({
					ref: [
						{
							explanation:
								'A wipe code entered at the PIN prompt immediately erases all private data and resets the device, with no confirmation step.',
							url: 'https://trezor.io/learn/security-privacy/personal-security-standards/set-up-a-wipe-code-to-erase-your-trezor',
						},
						{
							explanation:
								'Every passphrase opens a different wallet, and after a reboot the device gives no indication of how many passphrases it has been used with.',
							urls: [
								{
									label: 'What is a passphrase',
									url: 'https://trezor.io/guides/backups-recovery/advanced-wallets/what-is-a-passphrase',
								},
								{
									label: 'Bug bounty scope: plausible deniability',
									url: 'https://trezor.io/other/partner-portal/for-developers/trezor-bug-bounty-program-scope-rules-and-rewards',
								},
							],
						},
					],
					actions: {
						[DuressAction.DECOY_WALLET]: true,
						[DuressAction.SELF_DESTRUCT]: true,
						[DuressAction.ONCHAIN_LOCKDOWN]: false,
						[DuressAction.WIPE_AND_FORWARD]: false,
					},
				}),
			},
			firmware: {
				// Firmware updates need an on-device confirmation; the bootloader checks Ed25519 signatures on every boot and enforces downgrade protection.
				// Source: https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/docs/core/misc/boot.md
				// Reproducible builds are documented: build in Docker/Nix, zero out the signature data of the official image and compare hashes.
				// Source: https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/docs/common/reproducible-build.md
				// WalletScrutiny currently lists Trezor Safe 5 with a "source available" verdict rather than "reproducible".
				// Source: https://walletscrutiny.com/hardware/trezorSafe5/
				// Users can install custom firmware. On Safe models this requires irreversibly unlocking the bootloader, which wipes the device and disables the attestation key; unofficial firmware shows a warning at boot.
				// Source: https://trezor.io/learn/a/unlocking-the-bootloader-on-trezor-safe-3
				type: FirmwareType.PASS,
				customFirmware: FirmwareType.PASS,
				details:
					'On-device confirmation for updates with signature checks and downgrade protection; open-source (GPLv3) firmware; documented reproducible builds not yet independently confirmed by WalletScrutiny; custom firmware supported with a wipe and permanent warning.',
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PARTIAL,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://github.com/trezor/trezor-firmware/blob/6ab39e95cf45d4b25b3f677806012ac660ae7a51/docs/core/misc/boot.md',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The seed is generated on the device from its own entropy combined with entropy supplied by the host; Trezor Suite can verify the result with a commit-reveal "entropy check".',
						url: 'https://trezor.io/learn/security-privacy/how-trezor-keeps-you-safe/entropy-check-how-trezor-suite-verifies-wallet-generation',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			// No public independent audit report of Trezor firmware or devices was found. Trezor's bug
			// bounty page says its code has "undergone audits by independent security researchers for
			// many years" but names no auditor and links no report.
			publicSecurityAudits: [],
			secureElement: supported({
				ref: [
					{
						explanation:
							'Equipped with features including the Secure Element (EAL6+) and device-entry passphrase, it’s an impenetrable security pair.',
						url: 'https://trezor.io/trezor-safe-3',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// Trezor Model T and Safe devices ship with a tamper-evident holographic seal over the USB-C connector; Model One boxes carry two holographic seals.
				// Source: https://trezor.io/support/a/is-my-device-safe-to-use
				// Hardware designs are published under AGPL-3.0 and CERN-OHL-S. Model One and Model T include full schematic and PCB sources with a BOM; Trezor Safe 5 has schematic PDFs only, with no PCB sources or BOM.
				// Source: https://github.com/trezor/trezor-hardware
				// Safe 3 and Safe 5 use an EAL6+ secure element that only releases the PIN-gated secret on the correct PIN; private keys stay on the main chip.
				// Source: https://trezor.io/learn/security-privacy/how-trezor-keeps-you-safe/secure-elements-in-trezor-safe-devices
				// Ledger Donjon bypassed the Trezor Safe 3 authenticity checks (reported 2024-11-12); Trezor states Safe 5 is not affected.
				// Source: https://trezor.io/vulnerability/donjon-s-trezor-safe-3-evaluation
				// Devices ship without firmware, the bootloader only accepts signed firmware, and Trezor Suite verifies Safe devices with a secure-element-signed certificate issued before the device leaves the production line.
				// Source: https://trezor.io/learn/a/trezor-safe-device-authentication-check
				type: SupplyChainFactoryType.PARTIAL,
				details:
					'Tamper-evident seals and an authenticity check backed by the secure element; partial open hardware (no BOM or PCB sources for Safe 5); no published factory security documentation or factory audit.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PARTIAL,
				tamperEvidence: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PARTIAL,
				url: 'https://trezor.io/support/a/is-my-device-safe-to-use',
			},
			transactionLegibility: {
				ref: [
					{
						explanation: 'Independent video showing transaction details on Trezor Safe 5',
						url: 'https://youtube.com/shorts/4LayLrSuHNg',
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
							"Independent video demonstration of Trezor's signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1108',
					},
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
							'Trezor lists independent wallets that support its devices, including MetaMask, Rabby and Ambire.',
						url: 'https://trezor.io/guides/third-party-wallet-apps/third-party-wallet-apps-dapps',
					},
					{
						explanation:
							'Web apps reach the device through Trezor Suite Desktop over a local WebSocket when it is running, and otherwise through a Suite Web popup hosted by Trezor.',
						url: 'https://connect.trezor.io/10/',
					},
					{
						explanation:
							'By default, Trezor Suite connects to servers run by Trezor; users can switch to their own backend server.',
						url: 'https://trezor.io/guides/trezor-suite/connect-trezor-suite-to-your-own-node',
					},
				],
				details:
					'Works with many independent wallets. Web integrations through Trezor Connect and Trezor Suite contact Trezor-run servers by default; custom backends and Tor are available in Suite.',
				interoperability: InteroperabilityType.PASS,
				noSupplierLinkage: InteroperabilityType.PARTIAL,
			},
		},
		transparency: {
			maintenance: {
				// Trezor Safe 5 lists a Gorilla Glass 3 screen and operating temperature range but no drop or water rating; only Trezor Safe 7 is IP54-rated.
				// Source: https://trezor.io/trezor-safe-5
				// Warranty is two years for individual customers and one year for business customers; extended warranties are only offered where shown in the Trezor Shop.
				// Source: https://trezor.io/support/logistics/warranty-returns/trezor-warranty-coverage-period-and-terms
				// Defective devices may be repaired or replaced under warranty, but users are told not to open or repair the device themselves and no spare parts are offered.
				// Source: https://trezor.io/documents/product_terms_of_use.pdf
				// Trezor Safe 3, Safe 5, Model T and Model One have no battery (USB-powered); only Trezor Safe 7 has a LiFePO4 battery.
				// Source: https://trezor.io/compare
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.PASS,
				details:
					'No battery on Safe 5; two-year consumer warranty; repair or replacement only through warranty; no drop/water rating or MTBF data for Safe 5.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.PARTIAL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://trezor.io/trezor-safe-5',
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
				// Trezor launched the Model One in 2014. Model One and Model T, withdrawn from sale in January 2026, keep critical security updates until at least 2036.
				// Source: https://trezor.io/other/product-updates/how-long-will-trezor-model-one-and-model-t-be-supported
				// Hardware and firmware are designed in-house and published; Safe 3 and Safe 5 use a secure element from an external vendor, and Safe 7 adds one from sister company Tropic Square.
				// Source: https://trezor.io/learn/security-privacy/how-trezor-keeps-you-safe/secure-elements-in-trezor-safe-devices
				// Trezor maintains a public list of resolved vulnerabilities (58 entries from 2014 to 2026) naming reporters and affected models.
				// Source: https://trezor.io/security
				// Bug bounty rewards up to $100,000 for core firmware, uncapped for exceptionally critical issues.
				// Source: https://trezor.io/other/partner-portal/for-developers/bug-bounty-program
				type: ReputationType.PASS,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PASS,
				details:
					'Original in-house design on the market since 2014, long support commitments for discontinued models, a public vulnerability list and a bug bounty of up to $100,000 or more.',
				disclosureHistory: ReputationType.PASS,
				originalProduct: ReputationType.PASS,
				url: 'https://trezor.io/other/product-updates/how-long-will-trezor-model-one-and-model-t-be-supported',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}

// Flagship : Trezor safe 5 : @https://trezor.io/trezor-safe-5
// Trezor safe 3 : @https://trezor.io/trezor-safe-3
// Trezor model one : @https://trezor.io/trezor-model-one
// Trezor model T / @https://trezor.io/trezor-model-t
