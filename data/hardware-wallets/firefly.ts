import { mattmatt } from '@/data/contributors/0xmattmatt'
import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { FirmwareType } from '@/schema/features/security/firmware'
import { SupplyChainDIYType } from '@/schema/features/security/supply-chain-diy'
import { noDataExtraction } from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const fireflyWallet: HardwareWallet = {
	metadata: {
		id: 'firefly',
		displayName: 'Firefly Wallet',
		tableName: 'Firefly',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, mattmatt, minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
		hardwareWalletModels: [
			{
				id: 'firefly-v1',
				name: 'Firefly V1',
				isFlagship: true,
				url: 'https://firefly.city/',
			},
		],
		iconExtension: 'jpg',
		lastUpdated: '2026-10-08',
		urls: {
			websites: ['https://firefly.city/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: null,
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'Firefly V1 firmware and hardware: "MIT and BSD license. Each file includes license information at the top."',
						url: 'https://github.com/firefly/wallet',
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Firefly received a 50k USDC ENS DAO Public Goods large grant in the Q3 2024 round.',
					url: 'https://discuss.ens.domains/t/active-q3-2024-large-grants/19311',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: true,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
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
			privacyPolicy: '',
			transactionPrivacy: {
				// No stealth address, RAILGUN, Privacy Pools or Tornado Cash support in either Firefly generation's firmware; the demo app sends plain public transactions.
				// Source: https://github.com/firefly
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupported,
			duressResistance: null,
			firmware: {
				// Firefly V1 is flashed over USB with the Arduino toolchain; the current Pixie devkit also has no signature check ("# CONFIG_SECURE_BOOT is not set"), so any connected computer can install firmware without on-device approval.
				// Source: https://github.com/firefly/wallet
				// Source: https://github.com/firefly/pixie-firmware/blob/main/sdkconfig
				// Users are encouraged to build and flash their own firmware ("customize the source code and add your own interesting features").
				// Source: https://firefly.city/
				// No reproducible build process is documented.
				// Source: https://github.com/firefly/pixie-firmware
				type: FirmwareType.PARTIAL,
				customFirmware: FirmwareType.PASS,
				details:
					'Open-source firmware that users can modify and flash; no update signature checks or on-device approval; no reproducible builds.',
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: FirmwareType.FAIL,
				url: 'https://github.com/firefly/wallet',
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			// No public third-party audit of either Firefly generation found (GitHub org, firefly.city, firefly.app, project pages, web search).
			// Source: https://github.com/firefly
			publicSecurityAudits: [],
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: {
				// Firefly V1 is an "Arduino-based hardware wallet" built from about $5 in parts; schematics and source are published without an NDA.
				// Source: https://hackaday.io/project/146319
				type: SupplyChainDIYType.PASS,
				componentSourcingComplexity: SupplyChainDIYType.PASS,
				details:
					'Built from about $5 of common hobbyist parts around an Arduino, with published schematics and source; no NDA components.',
				diyNoNda: SupplyChainDIYType.PASS,
				url: 'https://github.com/firefly/wallet',
			},
			supplyChainFactory: null,
			transactionLegibility: {
				ref: refTodo,
				dataExtraction: noDataExtraction,
				detailsDisplayed: null,
				erc4361: null,
				erc7730: notSupportedWithRef({
					ref: refTodo,
				}),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
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
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
