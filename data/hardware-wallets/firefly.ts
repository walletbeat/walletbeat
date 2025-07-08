import { nconsigny } from '@/data/contributors/nconsigny'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
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
		contributors: [nconsigny],
		hardwareWalletManufactureType: HardwareWalletManufactureType.DIY,
		hardwareWalletModels: [
			{
				id: 'firefly-v1',
				name: 'Firefly V1',
				isFlagship: true,
				url: 'https://firefly.technology/',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: null,
		url: 'https://firefly.technology/',
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
			privacyPolicy: '',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.NONE,
				details: 'No formal bug bounty program has been established for the Firefly DIY wallet.',
				ref: undefined,
				upgradePathAvailable: false,
				url: '',
			},
			dappConnectionSupport: null,
			firmware: null,
			signingIntentClarity: {
				messageSigning: {
					calldataDecoding: null,
					details:
						'Firefly currently does not provide message signing support as it is still in development.',
					messageExtraction: null,
				},
				ref: null,
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
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
