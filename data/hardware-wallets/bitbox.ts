import { mattmatt } from '@/data/contributors/0xmattmatt'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import { bitbox } from '@/data/entities/bitbox'
import { etherscan } from '@/data/entities/etherscan'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	noCalldataDecoding,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const bitboxWallet: HardwareWallet = {
	metadata: {
		id: 'bitbox',
		displayName: 'BitBox',
		tableName: 'BitBox',
		blurb: paragraph(`
			BitBox02 is a hardware wallet with fully open-source firmware and a unique secure chip architecture that doesn't require trusting closed-source code.
		`),
		contributors: [patrickalphac, mattmatt],
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
		lastUpdated: '2025-01-07',
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
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: [
				{
					explanation:
						'BitBox blog post explaining WalletConnect integration for secure dApp connections',
					url: 'https://blog.bitbox.swiss/en/using-walletconnect-to-securely-connect-to-your-favorite-dapp/',
				},
			],
			requiresManufacturerConsent: null,
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
			ref: refTodo,
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
		multiAddress: null,
		privacy: {
			dataCollection: {
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
						},
					],
				},
				[UserFlow.ONBOARDING]: {
					collected: [],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.APP_CONNECTION]: 'FLOW_NOT_SUPPORTED',
				[UserFlow.NATIVE_SWAP]: 'FLOW_NOT_SUPPORTED',
				[UserFlow.SEND]: {
					collected: [],
				},
				[UserFlow.TRANSACTION]: {
					collected: [],
				},
			},
			hardwarePrivacy: null,
			privacyPolicy: 'https://bitbox.swiss/policies/privacy-policy/',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'At Shift Crypto, we strive towards excellence when it comes to the security and privacy of our products and believe that an open architecture is vital to keep our users safe. However, even in time-proven security architectures, vulnerabilities can be found. This is why our code is open source. In the case you find a vulnerability, we would like to ask you to follow our bug bounty program for responsible disclosure.',
						url: 'https://bitbox.swiss/bug-bounty-program/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-06-08' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			firmware: {
				type: FirmwareType.PASS,
				customFirmware: null,
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation: 'Independent video demonstration of BitBox02 signing capabilities',
						url: 'https://youtu.be/-m1jcBFS0dc?t=300',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					chain: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					from: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					gas: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: TransactionDisplayOptions.NOT_IN_UI,
					to: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					value: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
				},
				legibility: noCalldataDecoding,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
