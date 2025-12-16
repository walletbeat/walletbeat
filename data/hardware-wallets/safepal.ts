import { mattmatt } from '@/data/contributors/0xmattmatt'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { WalletProfile } from '@/schema/features/profile'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const safepalWallet: HardwareWallet = {
	metadata: {
		id: 'safepal',
		displayName: 'SafePal',
		tableName: 'SafePal',
		blurb: paragraph(`
			This is a fictitious hardware wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
		contributors: [mattmatt],
		hardwareWalletModels: [
			{
				id: 'safepal-s1-pro',
				name: 'SafePal S1 Pro',
				isFlagship: true,
				url: 'https://www.safepal.com/en/store/s1pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-12-16',
		urls: {
			extensions: [
				'https://chromewebstore.google.com/detail/safepal-extension-wallet/lgmpcpglpngdoalbgeoldeajfclnhafa',
			],
			socials: {
				facebook: 'https://www.facebook.com/iSafePal',
				instagram: 'https://www.instagram.com/isafepal/',
				linkedin: 'https://www.linkedin.com/company/safepal/',
				telegram: 'https://t.me/SafePalTG',
				tiktok: 'https://www.tiktok.com/@safepal_wallet',
				x: 'https://x.com/iSafePal',
				youtube: 'https://www.youtube.com/channel/UCfqztNiZWV62Eu9kiqKf6WQ',
			},
			websites: ['https://www.safepal.com/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: refTodo,
			supportedConnections: {
				[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
			},
		}),
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
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupported,
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			secureElement: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: null,
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
