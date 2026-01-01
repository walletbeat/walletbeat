import { mako } from '@/data/contributors/mako'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { FirmwareType } from '@/schema/features/security/firmware'
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import {
	CalldataDecoding,
	DataDecoded,
	DataExtraction,
	displaysFullTransactionDetails,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { comprehensiveFeesShownByDefault } from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const imkeyWallet: HardwareWallet = {
	metadata: {
		id: 'imkey',
		displayName: 'imKey',
		tableName: 'imKey',
		blurb: paragraph(`
			Incubated by imToken, imKey is a reliable digital wallet that supports access to 50+ major networks
			(including Bitcoin, Ethereum, and Tron). Built with an EAL6+ certified secure chip, imKey ensures
			private keys are generated, stored, and used entirely within the device for maximum protection.
			Seamlessly integrated with imToken on mobile and compatible with the Rabby browser extension on PC,
			imKey enables users to manage assets, interact with DApps, and perform transactions with enhanced security and flexibility.
		`),
		contributors: [mako],
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
		lastUpdated: '2025-10-30',
		urls: {
			repositories: ['https://github.com/consenlabs/imkey-core'],
			websites: ['https://imkey.im/'],
		},
	},
	features: {
		accountSupport: null,
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
								'Some firmware remains proprietary but reproducible builds ensure verifiable integrity.',
							url: 'https://github.com/consenlabs/imkey-core',
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
						'imKey Pro is a one-time hardware purchase with no subscription or custodial service fees. Transactions incur only standard on-chain gas fees.',
					url: 'https://imkey.im/products/imkey-pro-crypto-hardware-wallet',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: false,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
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
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			firmware: {
				type: FirmwareType.PASS,
				customFirmware: null,
				details:
					'All firmware updates are distributed via imKey Manager and must pass digital signature checks. Updates require explicit user confirmation and cannot be installed silently.',
				firmwareOpenSource: FirmwareType.PARTIAL,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
				url: 'https://support.imkey.im/hc/en-001/articles/36709320202649',
			},
			keysHandling: null,
			lightClient: { ethereumL1: null },
			publicSecurityAudits: null,
			secureElement: null,
			supplyChainDIY: null,
			supplyChainFactory: {
				type: SupplyChainFactoryType.PASS,
				details:
					'Manufactured with QA and serial verification; tamper-evident packaging and official-channel logistics mitigate supply chain attacks. Verification: https://imkey.im/pages/sn-check, https://learn.imkey.im/hc/en-001/articles/42589035963417',
				factoryOpsecAudit: SupplyChainFactoryType.PASS,
				factoryOpsecDocs: SupplyChainFactoryType.PASS,
				genuineCheck: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PASS,
				tamperEvidence: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PASS,
				url: 'https://imkey.im/pages/verify',
			},

			transactionLegibility: {
				ref: [
					{
						explanation:
							'imKey interacts seamlessly with DApps through the imToken in-app browser and supports connection via Rabby or WalletConnect.',
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
					nonce: TransactionDisplayOptions.NOT_IN_UI,
				},
				legibility: {
					[CalldataDecoding.ETH_USDC_TRANSFER]: supported({
						ref: refTodo,
						decoded: DataDecoded.ON_DEVICE,
					}),
					[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: supported({
						ref: refTodo,
						decoded: DataDecoded.ON_DEVICE,
					}),
					[CalldataDecoding.USDC_APPROVAL]: notSupported,
					[CalldataDecoding.AAVE_SUPPLY]: notSupported,
					[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: notSupported,
					[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						notSupported,
				},
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
			maintenance: null,
			operationFees: {
				builtInErc20Swap: notSupported,
				erc20L1Transfer: supported(comprehensiveFeesShownByDefault),
				ethL1Transfer: supported(comprehensiveFeesShownByDefault),
				uniswapUSDCToEtherSwap: notSupported,
			},
			reputation: null,
		},
	},
	variants: { [Variant.HARDWARE]: true },
}
