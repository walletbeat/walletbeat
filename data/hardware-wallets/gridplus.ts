import { nconsigny, patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import {
	DappConnectionMethod,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-dapp-connection-support'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/signing-intent-clarity'
import { supported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const gridplusWallet: HardwareWallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		blurb: paragraph(`
			GridPlus Wallet is a secure hardware wallet that combines secure key storage
			with convenient authentication methods.
		`),
		contributors: [nconsigny, patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'gridplus-lattice1',
				name: 'GridPlus Lattice1',
				isFlagship: true,
				url: 'https://gridplus.io/products/lattice1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/GridPlus',
		url: 'https://gridplus.io/',
	},
	features: {
		accountSupport: null,
		license: null,
		monetization: {
			ref: null,
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
			privacyPolicy: 'https://gridplus.io/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				details:
					'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
				ref: [
					{
						explanation:
							'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations',
						url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
					},
				],
				upgradePathAvailable: true,
				url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
			},
			firmware: null,
			signingIntentClarity: {
				messageSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					details:
						'GridPlus Lattice1 provides message signing support, but does not show EIP-712 digests or hashes.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.COPY]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				ref: [
					{
						explanation:
							"Independent video demonstration of GridPlus's clear signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=2079',
					},
					{
						explanation:
							"Independent video demonstration of GridPlus's transaction implementation on Safe.",
						url: 'https://youtube.com/shorts/_s5PjZhgBig',
					},
				],
				transactionSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					calldataExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.COPY]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'GridPlus Lattice1 provides clear transaction support, showing all transaction data, and even doing nested calldata decoding in some cases.',
					displayedTransactionDetails: displaysFullTransactionDetails,
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
			feeTransparency: null,
			maintenance: null,
			reputation: null,
		},
		dappConnectionSupport: supported({
			supportedConnections: {
				[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.AMBIRE]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
			},
			ref: 'https://docs.gridplus.io/apps-and-integrations/lattice-manager',
		}),
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
