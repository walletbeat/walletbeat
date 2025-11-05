import { patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const onekeyWallet: HardwareWallet = {
	metadata: {
		id: 'onekey',
		displayName: 'OneKey Pro',
		tableName: 'OneKey Pro',
		blurb: paragraph(`
			OneKey Pro is a hardware wallet with excellent haptic feedback, air gap mode, and EAL6+ secure element.
		`),
		contributors: [patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'onekey-pro',
				name: 'OneKey Pro',
				isFlagship: true,
				url: 'https://onekey.so/products/onekey-pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-06',
		repoUrl: 'https://github.com/OneKeyHQ',
		url: 'https://onekey.so/',
	},
	features: {
		accountSupport: null,
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'OneKey has mixed licensing (GPLv3/LGPLv3/MIT)',
						url: 'https://walletscrutiny.com/hardware/onekey.pro/',
					},
				],
				license: FOSSLicense.GPL_3_0,
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
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://help.onekey.so/hc/en-us/articles/360002003315-Privacy-Policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				ref: [
					{
						explanation:
							'OneKey maintains a well-structured bug bounty program with clear scope, rewards up to $10,000 USDC for critical vulnerabilities, and separate categories for different components.',
						url: 'https://bugrap.io/bounties/OneKey',
					},
				],
				details:
					'OneKey offers a comprehensive bug bounty program covering app monorepo, firmware, hardware SDK, and websites. Rewards range from $100-$10,000 USDC based on severity, with higher rewards for firmware vulnerabilities.',
				upgradePathAvailable: false,
				url: 'https://bugrap.io/bounties/OneKey',
			},
			firmware: {
				type: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: null,
			},
			hardwareWalletAppSigning: {
				ref: [
					{
						explanation:
							"Independent video demonstration of OneKey Pro's signing implementation with a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1958',
					},
					{
						explanation: "Independent video showing OneKey Pro's transaction details",
						url: 'https://youtube.com/shorts/J_XG7cNOVhM',
					},
				],
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'OneKey Pro shows EIP-712 domain types and message data but does not display domain hash or message hash for easier verification.',
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
						'OneKey Pro shows all calldata but does not decode it, requiring users to manually interpret the transaction data.',
					displayedTransactionDetails: {
						...displaysFullTransactionDetails,
						chain: false,
						nonce: false,
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
