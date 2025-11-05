import { patrickalphac } from '@/data/contributors'
import { bitbox } from '@/data/entities/bitbox'
import { etherscan } from '@/data/entities/etherscan'
import {
	CollectionPolicy,
	DataCollectionPurpose,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	noCalldataDecoding,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const bitboxWallet: HardwareWallet = {
	metadata: {
		id: 'bitbox',
		displayName: 'BitBox',
		tableName: 'BitBox',
		blurb: paragraph(`
			BitBox02 is a hardware wallet with fully open-source firmware and a unique secure chip architecture that doesn't require trusting closed-source code.
		`),
		contributors: [patrickalphac],
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
		repoUrl: 'https://github.com/BitBoxSwiss/bitbox02-firmware',
		url: 'https://bitbox.swiss/',
	},
	features: {
		accountSupport: null,
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
			bugBountyProgram: {
				type: BugBountyProgramType.DISCLOSURE_ONLY,
				ref: [
					{
						url: 'https://bitbox.swiss/bug-bounty-program/',
					},
				],
				details:
					'BitBox maintains a comprehensive bug bounty program with a Hall of Thanks, clear disclosure process, and PGP-encrypted communication.',
				upgradePathAvailable: true,
				url: 'https://bitbox.swiss/bug-bounty-program/',
			},
			firmware: {
				type: FirmwareType.PASS,
				customFirmware: null,
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
			},
			hardwareWalletAppSigning: {
				ref: [
					{
						explanation: 'Independent video demonstration of BitBox02 signing capabilities',
						url: 'https://youtu.be/-m1jcBFS0dc?t=300',
					},
				],
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'BitBox02 displays all EIP-712 data on the device despite limited screen real estate. Does not show message digest/hash.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'BitBox02 shows all calldata on the device in raw format. Data extraction is limited to visual verification only.',
					displayedTransactionDetails: {
						chain: true,
						from: true,
						gas: true,
						nonce: false,
						to: true,
						value: true,
					},
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
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
