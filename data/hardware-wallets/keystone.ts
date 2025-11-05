import { nconsigny, patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const keystoneWallet: HardwareWallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone Wallet',
		tableName: 'Keystone',
		blurb: paragraph(`
			Keystone Wallet is a self-custodial hardware wallet that provides secure private
			key storage. It uses QR codes for air-gapped transaction signing.
		`),
		contributors: [nconsigny, patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keystone-pro',
				name: 'Keystone Pro',
				isFlagship: true,
				url: 'https://keyst.one/pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/KeystoneHQ',
		url: 'https://keyst.one/',
	},
	features: {
		accountSupport: null,
		licensing: null,
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
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://keyst.one/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				ref: [
					{
						explanation:
							'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users',
						url: 'https://keyst.one/bug-bounty-program',
					},
				],
				details:
					'The Keystone Bug Bounty Program is designed to encourage security research in Keystone hardware and software to award them for their invaluable contribution to the security of all Keystone users.',
				upgradePathAvailable: false,
				url: 'https://keyst.one/bug-bounty-program',
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
						explanation:
							"Independent video demonstration of Keystone's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=759',
					},
					{
						explanation:
							"Independent video demonstration of Keystone's transaction implementation on a Safe.",
						url: 'https://youtube.com/shorts/Ly9lo4g5NpA',
					},
				],
				messageSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: false,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					details:
						'Keystone provides full message signing support for many transactions, however, it is buggy on many transactions like with a Safe{Wallet}, making it unreliable in some cases. In some cases, it shows no data. This is mitigated by the fact that the wallet supports QR code transaction extraction.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: true,
					},
				},
				transactionSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: false,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					calldataExtraction: {
						[DataExtraction.EYES]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: true,
					},
					details:
						'Keystone provides almost full clear signing support, it breaks down for more complex transactions.',
					displayedTransactionDetails: { ...displaysFullTransactionDetails, nonce: false },
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
