import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { noDataExtraction } from '@/schema/features/security/transaction-legibility'
import { notSupported, notSupportedWithRef } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
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
		iconExtension: 'jpg',
		lastUpdated: '2025-03-12',
		urls: {
			websites: ['https://firefly.city/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: null,
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
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: '',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupported,
			duressResistance: null,
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
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
