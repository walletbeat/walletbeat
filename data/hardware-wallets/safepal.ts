import { mattmatt } from '@/data/contributors/0xmattmatt'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const safepalWallet: HardwareWallet = {
	metadata: {
		id: 'safepal',
		displayName: 'SafePal',
		tableName: 'SafePal',
		hardwareWalletModels: [
			{
				id: 'safepal-s1-pro',
				name: 'SafePal S1 Pro',
				isFlagship: true,
				url: 'https://www.safepal.com/en/store/s1pro',
			},
		],
		blurb: paragraph(`
			This is a fictitious hardware wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
		contributors: [mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-12-16',
		urls: {
			extensions: ['https://chromewebstore.google.com/detail/safepal-extension-wallet/lgmpcpglpngdoalbgeoldeajfclnhafa'],
			socials: {
				facebook: 'https://www.facebook.com/iSafePal',
				linkedin: 'https://www.linkedin.com/company/safepal/',
				telegram: 'https://t.me/SafePalTG',
				x: 'https://x.com/iSafePal',
				tiktok: 'https://www.tiktok.com/@safepal_wallet',
				instagram: 'https://www.instagram.com/isafepal/',
				youtube: 'https://www.youtube.com/channel/UCfqztNiZWV62Eu9kiqKf6WQ'
			},
			websites: ['https://www.safepal.com/'],
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
