import { patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	noCalldataDecoding,
	noDataExtraction,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const cypherockWallet: HardwareWallet = {
	metadata: {
		id: 'cypherock',
		displayName: 'Cypherock Wallet',
		tableName: 'Cypherock',
		blurb: paragraph(`
			The Cypherock has a secure element (EAL6+ rated) and uses a unique card-tapping system for transaction authorization.
		`),
		contributors: [patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'cypherock-x1',
				name: 'Cypherock X1',
				isFlagship: true,
				url: 'https://www.cypherock.com/product/cypherock-x1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-06',
		repoUrl: 'https://github.com/Cypherock',
		url: 'https://www.cypherock.com',
	},
	features: {
		accountSupport: null,
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Cypherock is open-source and reproducible',
						url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/main/LICENSE.md',
					},
				],
				license: FOSSLicense.MIT_WITH_CLAUSE,
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
			privacyPolicy: 'https://www.cypherock.com/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.BASIC,
				ref: [
					{
						explanation:
							'Bug bounty program with responsible disclosure policy and discretionary rewards',
						url: 'https://www.cypherock.com/bug-bounty',
					},
				],
				details:
					'Cypherock provides legal protection for security researchers and discretionary rewards for valid security issues affecting X1 Wallet and X1 Card.',
				upgradePathAvailable: true,
				url: 'https://www.cypherock.com/bug-bounty',
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
						explanation: "Independent video demonstration of Cypherock's signing implementation.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=534',
					},
					{
						explanation:
							"Independent video demonstration of Cypherock's transaction implementation.",
						url: 'https://youtube.com/shorts/YG6lzwTUojE',
					},
				],
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'Shows EIP-712 signature data only in the companion application, not on the hardware wallet itself.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: noDataExtraction,
					details:
						'Completely fails to display calldata for transactions on either the application or the hardware wallet itself.',
					displayedTransactionDetails: {
						chain: false,
						from: true, // derivation path counts
						gas: true, // tx fee
						nonce: false,
						to: true, // contract address
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
