import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import { synacktiv } from '@/data/entities/synacktiv'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { AccountType } from '@/schema/features/account-support'
import {
	AppConnectionMethod,
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
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { MaintenanceType } from '@/schema/features/transparency/maintenance'
import { ReputationType } from '@/schema/features/transparency/reputation'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { WalletMetadata } from '@/schema/wallet'
export const ledgerWalletMetadata: WalletMetadata = {
	id: 'ledger',
	displayName: 'Ledger Wallet',
	tableName: 'Ledger',
	coinspectId: { type: 'NO_COINSPECT_ID' },
	contributors: [nconsigny, patrickalphac, mattmatt, minimalsm],
	hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
	hardwareWalletModels: [
		{
			id: 'ledger-stax',
			name: 'Ledger Stax',
			isFlagship: true,
			url: 'https://shop.ledger.com/products/ledger-stax',
		},
		{
			id: 'ledger-nano-s',
			name: 'Ledger Nano S',
			isFlagship: false,
			url: 'https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device',
		},
		{
			id: 'ledger-nano-s-plus',
			name: 'Ledger Nano S+',
			isFlagship: false,
			url: 'https://shop.ledger.com/products/ledger-nano-s-plus',
		},
		{
			id: 'ledger-nano-x',
			name: 'Ledger Nano X',
			isFlagship: false,
			url: 'https://shop.ledger.com/products/ledger-nano-x',
		},
		{
			id: 'ledger-flex',
			name: 'Ledger Flex',
			isFlagship: false,
			url: 'https://shop.ledger.com/products/ledger-flex',
		},
	],
	iconExtension: 'svg',
	lastUpdated: '2026-10-08',
	urls: {
		docs: ['https://developers.ledger.com/'],
		repositories: ['https://github.com/LedgerHQ/'],
		socials: {
			facebook: 'https://web.facebook.com/Ledger/',
			instagram: 'https://www.instagram.com/ledger/',
			linkedin: 'https://www.linkedin.com/company/ledgerhq/',
			reddit: 'https://www.reddit.com/r/ledgerwallet/',
			tiktok: 'https://www.tiktok.com/@ledger',
			x: 'https://x.com/Ledger',
		},
		websites: ['https://www.ledger.com/'],
	},
}
export const ledgerWallet: HardwareWallet = {
	metadata: ledgerWalletMetadata,
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			// The Ethereum app (v1.17.0+, 2025-05-05) can sign EIP-7702 authorizations, but only with the
			// "Smart account upgrade" setting turned on (off by default) and only for allowlisted delegation
			// contracts. Ledger Wallet (Ledger Live) has no 7702 flow.
			eip7702: notSupportedWithRef({
				ref: [
					{
						explanation:
							'Ethereum app v1.17.0 added EIP-7702 authorization signing behind a "Smart account upgrade" setting that is off by default and limited to an allow list of delegation contracts.',
						url: 'https://github.com/LedgerHQ/app-ethereum/blob/e5b6dbff3aca3e3c97a1079c8dccbd1dafdb32c7/CHANGELOG.md',
					},
				],
			}),
			eoa: supported({
				ref: [
					{
						explanation:
							"Ethereum accounts are derived from a 24-word BIP-39 seed with BIP-32, using m/44'/60'/<account>'/0/0 by default (Ledger Live path) plus the legacy path.",
						url: 'https://github.com/LedgerHQ/ledger-live/blob/829a01505e7a9a9da207bc0b72641bf60d4bfc69/libs/ledger-wallet-framework/src/derivation.ts',
					},
					{
						explanation:
							'"Once the device is initialized, there is absolutely no way to retrieve the seed." The Ethereum app returns public keys and signatures only.',
						url: 'https://donjon.ledger.com/threat-model/os-seed-confidentiality/',
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
			ref: 'https://support.ledger.com/article/360018444599-zd',
			requiresManufacturerConsent: {
				type: 'FEATURES_GATED_BY_MANUFACTURER',
				ref: {
					explanation:
						"Software wallet developers are required to register with Ledger's partner program before their software wallet becomes able to display clear signing data on Ledger devices.",
					label: 'Ledger Developer Portal',
					url: 'https://developers.ledger.com/docs/clear-signing/for-wallets',
				},
			},
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The Ledger OS that runs on the secure element is closed source; Ledger lists "Protect the confidentiality of the firmware" as a security objective. Device apps such as the Ethereum app are Apache-2.0.',
						url: 'https://donjon.ledger.com/threat-model/',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Ledger raised a $380 million Series C led by 10T Holdings in 2021, after earlier venture rounds.',
					url: 'https://www.businesswire.com/news/home/20210609005985/en/Ledger-completes-a-%24380-million-Series-C-fundraising-valuing-the-company-at-more-than-%241.5-billion-to-strengthen-its-position-as-the-leading-secure-gateway-to-digital-assets',
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
			privacyPolicy: 'https://ledger.com/privacy-policy',
			transactionPrivacy: {
				// Ledger Wallet has no private transfer feature. RAILGUN's ledger-client SDK is a pre-1.0
				// app installed outside Ledger's app catalog for Flex and Nano S+ only, not a Ledger-supported feature.
				// Source: https://github.com/Railgun-Community/ledger-client
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			// Left null: Ledger Recover (opt-in, paid) splits encrypted seed entropy into three fragments held
			// by Ledger and two partner companies, restorable 2-of-3 after ID verification. The schema has no
			// guardian type for external custodians, so this needs a maintainer decision.
			// Source: https://shop.ledger.com/pages/ledger-recover
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Ledger Donjon runs a self-hosted bug bounty with safe harbor for researchers who follow its responsible disclosure rules and a 90-day disclosure policy; reward amounts are not published.',
						url: 'https://donjon.ledger.com/bounty/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2020-03-07' as const,
				disclosure: supported({
					numberOfDays: 90,
				}),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Ledger commits that security researchers reporting bugs will be protected from legal liability, so long as they follow responsible disclosure guidelines and principles.',
							url: 'https://donjon.ledger.com/bounty',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			firmware: {
				// Updates are signed by Ledger's HSM and installed over a secure channel; the independent OS review
				// found "Critical features require user consent ... Upgrading the firmware."
				// Source: https://donjon.ledger.com/threat-model/os-confidentiality-and-integrity/
				// Source: https://github.com/LedgerHQ/Ledger-OS-third-party-reports
				// The OS is closed, so it cannot be rebuilt: "Build cannot be done because the source code is not publicly available."
				// Source: https://walletscrutiny.com/hardware/ledgerNanoX/
				// Custom OS images are not possible. A custom certificate authority can install unlisted apps on Nano S+, Stax and Flex, but the device then fails the Genuine Check.
				// Source: https://developers.ledger.com/docs/device-app/deliver
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.FAIL,
				details:
					'Signed updates that need user consent on the device; closed-source OS that cannot be rebuilt; no custom OS.',
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://donjon.ledger.com/threat-model/os-confidentiality-and-integrity/',
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'"The seed can be either generated by the Secure Element itself thanks to its True Random Number Generator" or restored by the user on the device.',
						url: 'https://donjon.ledger.com/threat-model/os-seed-confidentiality/',
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
							explanation:
								'Synacktiv source review of the Ledger OS (Nano S+ 1.5.0, Nano X 2.6.0, Flex 1.5.0, Stax 1.9.0) for hidden features and undocumented access: "No dangerous features were found during the assessment."',
							url: 'https://github.com/LedgerHQ/Ledger-OS-third-party-reports/tree/ba5ce08be35b92ecdd81cf3bf75798f88d7665c8/January%202026',
						},
					],
					auditDate: '2026-01-19',
					auditor: synacktiv,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.HARDWARE]: true },
				},
				{
					ref: [
						{
							explanation:
								'Synacktiv source review of the Ledger OS (Nano S+ 1.4.0, Nano X 2.5.0, Flex 1.4.0, Stax 1.8.0) for hidden features and undocumented access: "No dangerous features were found during the assessment."',
							url: 'https://github.com/LedgerHQ/Ledger-OS-third-party-reports/tree/ba5ce08be35b92ecdd81cf3bf75798f88d7665c8/July%202025',
						},
					],
					auditDate: '2025-07-17',
					auditor: synacktiv,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.HARDWARE]: true },
				},
				{
					ref: [
						{
							explanation:
								'Synacktiv source review of the Ledger OS (Nano S+ 1.3.1, Nano X 2.4.1, Flex 1.2.1, Stax 1.6.1) for hidden features and undocumented access: "No dangerous features were found during the assessment."',
							url: 'https://github.com/LedgerHQ/Ledger-OS-third-party-reports/tree/ba5ce08be35b92ecdd81cf3bf75798f88d7665c8/December%202024',
						},
					],
					auditDate: '2024-12-20',
					auditor: synacktiv,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.HARDWARE]: true },
				},
			],
			secureElement: supported({
				ref: [
					{
						explanation:
							'Ledger devices have an EAL 5+ or an EAL 6+ certification depending on which device you get.',
						url: 'https://www.ledger.com/academy/security/the-secure-element-whistanding-security-attacks',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				// Attestation keys are provisioned at the factory through a Ledger HSM; no physical factory controls are documented.
				// Source: https://donjon.ledger.com/threat-model/device-genuineness/
				// French government security certificates (Nano X 2023, Stax 2025) cover the product, not manufacturing, and assume "The HSM is properly operated by LEDGER".
				// Source: https://messervices.cyber.gouv.fr/visas/ANSSI-CSPN-2025-03-cible.pdf
				// Ledger avoids packaging seals ("Classic anti-tampering seals ... trivial to clone"); most Flex devices ship with an anti-tamper seal and Nano Gen5 has a tamper-evident casing, while Stax, Nano X and Nano S+ have none.
				// Source: https://support.ledger.com/article/4404389367057-zd
				// No schematics or BOM are published: "Ledger is not obligated to distribute ... proprietary hardware schematics".
				// Source: https://support.ledger.com/article/14716777063837-zd
				// Secure elements: ST33K1M5 (CC EAL6+) on Stax, Flex and Nano S+, ST33J2M0 (EAL5+) on Nano X; the secure element checks the MCU flash at boot.
				// Source: https://sec-certs.org/cc/1e7fe9a44df65612/
				// Genuine Check: the secure element proves a factory-provisioned key to Ledger's HSM through Ledger Wallet.
				// Source: https://support.ledger.com/article/4404389367057-zd
				type: SupplyChainFactoryType.FAIL,
				details:
					'Factory key provisioning documented, but no factory audit; tamper-evident seals on some models only; no published schematics; certified secure element; cryptographic genuine check.',
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				factoryOpsecDocs: SupplyChainFactoryType.PARTIAL,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.PARTIAL,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://donjon.ledger.com/threat-model/device-genuineness/',
			},
			transactionLegibility: {
				ref: refTodo,
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: displaysFullTransactionDetails,
				erc4361: null,
				erc7730: notSupportedWithRef({
					ref: {
						explanation:
							"Independent video demonstration of Ledger's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1722',
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
				// No drop, water-resistance or MTBF ratings are published; Ledger gives an expected device lifespan of 3-5 years.
				// Source: https://support.ledger.com/article/The-Expected-Lifespan-of-Ledger-Devices
				// Devices are "not designed to be manually repaired"; the Nano X battery "cannot be replaced". Stax and Flex also have batteries.
				// Source: https://support.ledger.com/article/360015216913-zd
				// One-year limited warranty, which excludes batteries; Ledger Replace is a paid replacement plan.
				// Source: https://shop.ledger.com/pages/one-year-limited-warranty
				// Source: https://support.ledger.com/article/14679623461021-zd
				type: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				details:
					'No durability ratings; expected lifespan stated but no MTBF data; no repairs; non-replaceable batteries excluded from the one-year warranty; paid replacement plan.',
				mtbfDocumentation: MaintenanceType.PARTIAL,
				physicalDurability: MaintenanceType.FAIL,
				repairability: MaintenanceType.FAIL,
				url: 'https://shop.ledger.com/pages/one-year-limited-warranty',
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
				// Founded 2014; hardware and OS designed in-house around ST secure elements. Current models: Stax, Flex, Nano Gen5, Nano X, Nano S+.
				// Source: https://www.ledger.com/
				// End-of-life policy published; Nano S reached end of sale in June 2022 under that policy.
				// Source: https://shop.ledger.com/pages/ledger-os-and-device-apps-policy
				// Public security bulletins (LSB 001-025) with credit to finders; the 2020 customer data breach and the 2023 Connect Kit compromise both got incident reports.
				// Source: https://donjon.ledger.com/lsb/
				// Source: https://www.ledger.com/blog/security-incident-report
				// Bug bounty with safe harbor and a 90-day disclosure policy, but no published reward amounts.
				// Source: https://donjon.ledger.com/bounty/
				type: ReputationType.PASS,
				availability: ReputationType.PASS,
				bugBounty: ReputationType.PARTIAL,
				details:
					'Original in-house design on the market since 2014 with a published support policy; public security bulletin list and incident reports; bug bounty with safe harbor but no published reward amounts.',
				disclosureHistory: ReputationType.PASS,
				originalProduct: ReputationType.PASS,
				url: 'https://donjon.ledger.com/lsb/',
				warrantySupportRisk: ReputationType.PASS,
			},
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}

// add entries for

// For Ledger I need :

// Ledger nano S : @https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device
// Ledger nano S + :  @https://shop.ledger.com/products/ledger-nano-s-plus
// Ledger nano X : @https://shop.ledger.com/products/ledger-nano-x
// Ledger flex : @https://shop.ledger.com/products/ledger-flex
// flagship : Ledger stax : @https://shop.ledger.com/products/ledger-stax
