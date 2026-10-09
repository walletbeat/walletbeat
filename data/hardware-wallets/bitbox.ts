import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import { bitbox } from '@/data/entities/bitbox'
import { etherscan } from '@/data/entities/etherscan'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	EntityRole,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
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
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	DataDisplayOptions,
	DataExtraction,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const bitboxWallet: HardwareWallet = {
	metadata: {
		id: 'bitbox',
		displayName: 'BitBox',
		tableName: 'BitBox',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [patrickalphac, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'bitbox02-multi',
				name: 'BitBox02 Multi',
				isFlagship: true,
				url: 'https://bitbox.swiss/bitbox02/',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://bitbox.swiss/dev/'],
			repositories: ['https://github.com/BitBoxSwiss/bitbox02-firmware'],
			socials: {
				facebook: 'https://web.facebook.com/BitBoxSwiss',
				instagram: 'https://www.instagram.com/bitboxswiss/',
				linkedin: 'https://www.linkedin.com/company/bitbox-swiss/',
				reddit: 'https://www.reddit.com/r/BitBoxWallet/',
				x: 'https://x.com/BitBoxSwiss',
				youtube: 'https://www.youtube.com/@bitboxswiss',
			},
			websites: ['https://bitbox.swiss/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'The BitBox02 Ethereum protocol only defines legacy (EIP-155) and EIP-1559 (type 2) transaction payloads; there is no type-4 or authorization-list message.',
						label: 'BitBox02 Ethereum protocol messages',
						url: 'https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/messages/eth.proto',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"Ethereum accounts use the BIP-44 path m/44'/60'/0'/0/n (up to 100 accounts) from a BIP-39 seed.",
						url: 'https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/src/rust/bitbox02-rust/src/hww/api/ethereum/keypath.rs',
					},
					{
						explanation:
							'The recovery words can be shown again on the device screen after entering the device password.',
						url: 'https://bitbox.helpjuice.com/en_US/wiederherstellungsworter-anzeigen-bitbox02',
					},
					{
						explanation:
							'The Ethereum API returns public keys and signatures only; it has no private key export.',
						label: 'BitBox02 Ethereum protocol messages',
						url: 'https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/messages/eth.proto',
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
			ref: [
				{
					explanation:
						'BitBox blog post explaining WalletConnect integration for secure app connections',
					url: 'https://blog.bitbox.swiss/en/using-walletconnect-to-securely-connect-to-your-favorite-dapp/',
				},
				{
					explanation:
						'BitBox publishes Apache-2.0 libraries for integrating the BitBox02 into other wallets, covering Ethereum transactions, personal messages and EIP-712 typed data. Pairing happens between the device and the integrating app.',
					urls: [
						{
							label: 'bitbox-api (Rust and TypeScript)',
							url: 'https://github.com/BitBoxSwiss/bitbox-api-rs/blob/db3f923c1b109fc75b7c37ab90856756ee6beec3/Cargo.toml',
						},
						{
							label: 'Ethereum signing API',
							url: 'https://github.com/BitBoxSwiss/bitbox-api-rs/blob/db3f923c1b109fc75b7c37ab90856756ee6beec3/src/eth.rs',
						},
					],
				},
				{
					explanation:
						'The BitBox Bridge app allows browser extensions to connect and asks the user before allowing any other website.',
					url: 'https://github.com/BitBoxSwiss/bitbox-bridge/blob/63385207a0fb37f9bd7f0ff351214981a9b76d75/CHANGELOG.md',
				},
			],
			requiresManufacturerConsent: { type: 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE' },
			supportedConnections: {
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
				[SoftwareWalletType.RABBY]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'BitBox02 firmware is fully open source and verified by WalletScrutiny',
						url: 'https://github.com/BitBoxSwiss/bitbox02-firmware',
					},
				],
				license: FOSSLicense.APACHE_2_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'The venture arm of SIX, the Swiss stock exchange operator, made an undisclosed investment in Shift Crypto (now BitBox Swiss) in 2018.',
					label: 'News report on the SIX investment',
					url: 'https://fintechnews.ch/fintech/six-fintech-venture-finds-first-investments-vestr-and-shift-cryptosecurity/',
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
		multiAddress: supported({
			ref: [
				{
					explanation:
						'The BitBoxApp supports up to five Ethereum accounts per wallet, and the firmware accepts address indexes 0 to 99 on the standard Ethereum path, which independent wallets such as Rabby use.',
					urls: [
						{
							label: 'Manage accounts in the BitBoxApp',
							url: 'https://support.bitbox.swiss/en_US/manage-accounts-bitboxapp',
						},
						{
							label: 'Firmware key path limits',
							url: 'https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/src/rust/bitbox02-rust/src/hww/api/ethereum/keypath.rs',
						},
					],
				},
			],
		}),
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: {
				[UserFlow.INSTALL]: null,
				[UserFlow.UNCLASSIFIED]: {
					collected: [
						{
							ref: [
								{
									explanation:
										'BitBoxApp sends IP address for update checks and uses BitBox backend servers for Bitcoin address lookups',
									url: 'https://bitbox.swiss/policies/privacy-policy/',
								},
							],
							byEntity: bitbox,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.USER_ACTIONS]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
							},
							purposes: [DataCollectionPurpose.ANALYTICS],
							role: EntityRole.OPERATOR,
						},
						{
							ref: [
								{
									explanation:
										'BitBoxApp uses Etherscan to query Ethereum and ERC20 token account information',
									url: 'https://bitbox.swiss/policies/privacy-policy/',
								},
							],
							byEntity: etherscan,
							dataCollection: {
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.BY_DEFAULT,
								[WalletInfo.BALANCE]: CollectionPolicy.BY_DEFAULT,
								endpoint: RegularEndpoint,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.ASSET_METADATA,
							],
							role: EntityRole.OPERATOR,
						},
					],
				},
				[UserFlow.ONBOARDING_NEW]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_IMPORT]: null,
				[UserFlow.APP_CONNECTION]: 'FLOW_NOT_SUPPORTED',
				[UserFlow.NATIVE_SWAP]: 'FLOW_NOT_SUPPORTED',
				[UserFlow.SEND_ETHER]: {
					collected: [],
				},
				[UserFlow.SEND_USDC]: null,
				[UserFlow.MAKE_TRANSACTION]: {
					collected: [],
				},
			},
			// The BitBox02 connects over USB-C only. The BitBox02 Nova adds Bluetooth Low Energy with LE Secure
			// Connections and authenticated pairing; Bluetooth can be disabled from a USB host. On both, the app
			// and device encrypt and authenticate traffic with the Noise protocol and a pairing code confirmed on
			// both screens.
			// Source: https://bitbox.swiss/bitbox02/threat-model/
			// Source: https://blog.bitbox.swiss/en/whisper-how-the-secure-bluetooth-integration-of-the-bitbox02-nova-works/
			// Source: https://support.bitbox.swiss/en_US/nova/enable-or-disable-bluetooth-bitbox02-nova-desktop
			// The device has no network access of its own. Unless a custom backend is configured, the BitBoxApp
			// uses Shift Crypto servers, checks for updates and fetches exchange rates from them, and retrieves
			// Ethereum data through an Etherscan proxy hosted by Shift Crypto. A custom node is only available for
			// Bitcoin; a Tor proxy covers all backend traffic on desktop.
			// Source: https://support.bitbox.swiss/en_US/privacy/bitboxapp-data-sharing
			// Source: https://github.com/BitBoxSwiss/bitbox-wallet-app/blob/042faba65b813deacba7df9591e06444f1ea7636/backend/coins/eth/etherscan/etherscan.go
			// Source: https://support.bitbox.swiss/en_US/privacy/bitboxapp-tor-setup
			// The BitBoxApp source is public under the Apache License 2.0.
			// Source: https://github.com/BitBoxSwiss/bitbox-wallet-app/blob/042faba65b813deacba7df9591e06444f1ea7636/LICENSE
			hardwarePrivacy: {
				type: HardwarePrivacyType.PARTIAL,
				details:
					'The device has no network access of its own, and the app-device link is end-to-end encrypted. The open-source BitBoxApp uses Shift Crypto servers by default, including an Etherscan proxy for Ethereum data that cannot be replaced; Tor is available on desktop.',
				inspectableRemoteCalls: HardwarePrivacyType.PASS,
				phoningHome: HardwarePrivacyType.PARTIAL,
				url: 'https://support.bitbox.swiss/en_US/privacy/bitboxapp-data-sharing',
				wirelessPrivacy: HardwarePrivacyType.PASS,
			},
			privacyPolicy: 'https://bitbox.swiss/policies/privacy-policy/',
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
				// "Can BitBox recover my funds for me? No. BitBox never has access to your recovery words or funds."
				// Source: https://support.bitbox.swiss/en_US/emergency-bitbox-backup-recovery
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'At Shift Crypto, we strive towards excellence when it comes to the security and privacy of our products and believe that an open architecture is essential for keeping our users safe. However, even in time-proven security architectures, vulnerabilities can be found. This is why we release our code as open source. If you find a vulnerability, we would like to ask you to follow our bug bounty program for responsible disclosure.',
						url: 'https://bitbox.swiss/bug-bounty-program/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-06-08' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								'The device password is mandatory during initial setup and cannot be disabled. After 10 incorrect attempts, the device resets to factory settings.',
							urls: [
								{
									label: 'Device password vs. optional passphrase',
									url: 'https://support.bitbox.swiss/en_US/device-password/device-password-vs-optional-passphrase',
								},
								{
									label: 'Device password',
									url: 'https://support.bitbox.swiss/en_US/device-password/bitbox-device-password',
								},
							],
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: notSupported,
						[BasicUnlockMechanism.PASSWORD]: supported({
							type: BasicUnlockMechanismSupport.REQUIRED,
						}),
						[BasicUnlockMechanism.BIOMETRIC]: notSupported,
						[BasicUnlockMechanism.PATTERN]: notSupported,
					},
				},
				duressMode: supported({
					ref: [
						{
							explanation:
								'The optional passphrase creates additional hidden wallets and, according to BitBox support, enables plausible deniability.',
							url: 'https://support.bitbox.swiss/en_US/device-password/device-password-vs-optional-passphrase',
						},
						{
							explanation:
								'BitBox names the BIP39 passphrase as a way to unlock a different wallet under duress, but does not guarantee plausible deniability.',
							url: 'https://support.bitbox.swiss/en_US/blog-content/how-we-do-security-assessments',
						},
					],
					actions: {
						[DuressAction.DECOY_WALLET]: true,
						[DuressAction.SELF_DESTRUCT]: false,
						[DuressAction.ONCHAIN_LOCKDOWN]: false,
						[DuressAction.WIPE_AND_FORWARD]: false,
					},
				}),
			},
			firmware: {
				// Production devices only boot firmware carrying valid Shift Crypto signatures (2 of 3 keys); unsigned firmware stays in the bootloader. Firmware that skips verification is only possible on separate developer bootloader builds marked "DEV DEVICE / NOT FOR VALUE".
				// Source: https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/src/bootloader/bootloader.c
				type: FirmwareType.PASS,
				customFirmware: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The seed is generated on the device from the secure chip and main chip random number generators plus factory entropy, with host and password entropy mixed in.',
						url: 'https://github.com/BitBoxSwiss/bitbox02-firmware/blob/d19a195e8880a8dc23ec246472a6f0113a3fc8b2/src/rust/bitbox02-rust/src/keystore.rs',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			// BitBox states that "The BitBox02 firmware was audited by Census Labs", but no report, date
			// or scope is published (checked bitbox.swiss, census-labs.com and web search).
			// Source: https://bitbox.swiss/bitbox02/security-features/
			publicSecurityAudits: [],
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// The threat model describes factory setup: debug interfaces disabled, bootloader made read-only, secure chip irreversibly configured, attestation key signed. It does not cover the facility or staff controls.
				// Source: https://bitbox.swiss/bitbox02/threat-model/
				// Devices ship in a sealed bag with a continuous gray pattern on the edges; the casing halves are joined with pins that break if separated.
				// Source: https://support.bitbox.swiss/en_US/verifying-the-bitbox02-packaging
				// PCB schematics, BOM and x-ray for BitBox02 hardware v2.1 (2020) are published in the firmware repository; no schematic or BOM is published for BitBox02 Nova.
				// Source: https://github.com/BitBoxSwiss/bitbox02-firmware
				// A secure chip (a Microchip part on BitBox02, an EAL6+ part from an external vendor on Nova) limits unlock attempts; the MCU and secure chip are covered with epoxy.
				// Source: https://bitbox.swiss/bitbox02/security-features/
				// A key generated on the secure chip is signed during factory setup, and the BitBoxApp checks it before every unlock.
				// Source: https://blog.bitbox.swiss/en/supply-chain-attacks/
				type: SupplyChainFactoryType.PARTIAL,
				details:
					'Factory lock-down steps documented, but no factory audit; sealed packaging and break-on-open casing; open schematics for the original BitBox02 hardware revision only; secure chip with epoxy; automatic attestation check in the BitBoxApp.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.PARTIAL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PARTIAL,
				tamperEvidence: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://blog.bitbox.swiss/en/supply-chain-attacks/',
			},
			transactionLegibility: {
				ref: refTodo,
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
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
				erc7730: notSupportedWithRef({
					ref: {
						explanation: 'Independent video demonstration of BitBox02 signing capabilities',
						url: 'https://youtu.be/-m1jcBFS0dc?t=300',
					},
				}),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			// BitBox lists Rabby, MEW and NuFi as compatible wallets for Ethereum. MetaMask does not support the
			// BitBox02.
			// Source: https://support.bitbox.swiss/en_US/bitbox02-supported-third-party-wallets-compatibility
			// Rabby and MEW pair with the device directly, but BitBox guides ask users to set up the wallet and
			// update firmware in the BitBoxApp.
			// Source: https://support.bitbox.swiss/en_US/why-pairing-bitbox02-with-bitboxapp-is-essential
			// Source: https://support.bitbox.swiss/en_US/myetherwallet-bitbox02-connect
			// Source: https://support.bitbox.swiss/en_US/update-bitbox02-firmware
			// Unless a custom backend is configured, the BitBoxApp connects to backend infrastructure operated by
			// Shift Crypto.
			// Source: https://support.bitbox.swiss/en_US/privacy/bitboxapp-data-sharing
			interoperability: {
				type: InteroperabilityType.PARTIAL,
				details:
					'Works with Rabby, MEW and NuFi. Setup and firmware updates go through the BitBoxApp, which uses Shift Crypto servers by default.',
				interoperability: InteroperabilityType.PASS,
				noSupplierLinkage: InteroperabilityType.PARTIAL,
				url: 'https://support.bitbox.swiss/en_US/bitbox02-supported-third-party-wallets-compatibility',
			},
		},
		transparency: {
			maintenance: {
				// Warranty is two years from the date of payment; Shift Crypto may repair or replace the product.
				// Source: https://bitbox.swiss/policies/limited-warranty/
				// BitBoxCare (paid) extends the warranty from two to four years.
				// Source: https://bitbox.swiss/bitboxcare/
				// The product data sheets list no battery, drop or water rating, or MTBF figure.
				// Source: https://bitbox.swiss/bitbox02/
				type: MaintenanceType.PARTIAL,
				batteryHandling: MaintenanceType.PASS,
				details:
					'No battery; two-year warranty extendable to four years with BitBoxCare; repair or replacement only through warranty; no durability ratings or MTBF data.',
				mtbfDocumentation: MaintenanceType.FAIL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.PARTIAL,
				url: 'https://bitbox.swiss/policies/limited-warranty/',
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
				// The BitBox line started in 2015 (BitBox01); BitBox02 was released in 2019 and BitBox02 Nova in 2025. Hardware and firmware are designed in-house; MCU and secure chips come from external vendors.
				// Source: https://bitbox.swiss/about/
				// BitBox01 updates ended in November 2020, about a year after it stopped selling; the original BitBox02 is still supported alongside Nova.
				// Source: https://guides.shiftcrypto.ch/bitbox01/eol-faqs/
				// Vulnerabilities are disclosed in release blog posts with credit to finders (e.g. two severe firmware and bootloader issues fixed in 2026), but there is no consolidated advisory list.
				// Source: https://blog.bitbox.swiss/en/bitbox-08-2026-dixence-update/
				// The bug bounty publishes no reward amounts: rewards are "at a level that we feel is reasonable".
				// Source: https://bitbox.swiss/bug-bounty-program/
				type: ReputationType.PARTIAL,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original in-house design on the market since 2015 with continued support for BitBox02; vulnerabilities disclosed in release posts rather than an advisory list; bug bounty without published reward amounts.',
				disclosureHistory: ReputationType.PARTIAL,
				originalProduct: ReputationType.PASS,
				url: 'https://bitbox.swiss/about/',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
