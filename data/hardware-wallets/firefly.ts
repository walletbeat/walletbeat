import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { notSupported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const fireflyWallet: HardwareWallet = {
	metadata: {
		id: 'firefly',
		displayName: 'Firefly Wallet',
		tableName: 'Firefly',
		blurb: paragraph(`
			Firefly Wallet is a hardware wallet that uses biometrics
			for user authentication and secure private key management.
		`),
		contributors: [nconsigny, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
		hardwareWalletModels: [
			{
				id: 'firefly-v1',
				name: 'Firefly V1',
				isFlagship: true,
				url: 'https://firefly.city/',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			websites: ['https://firefly.city/'],
		},
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
			privacyPolicy: '',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: notSupported,
			firmware: null,
			hardwareWalletAppSigning: {
				ref: refTodo,
				messageSigning: {
					calldataDecoding: null,
					details:
						'Firefly currently does not provide message signing support as it is still in development.',
					messageExtraction: null,
				},
				transactionSigning: {
					calldataDecoding: null,
					calldataExtraction: null,
					details:
						'Firefly currently does not provide clear transaction signing support as it is still in development.',
					displayedTransactionDetails: null,
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			secureElement: null,
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
