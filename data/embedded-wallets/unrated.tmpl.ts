import { exampleContributor } from '@/data/contributors/example'
import { WalletProfile } from '@/schema/features/profile'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { EmbeddedWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const unratedEmbeddedTemplate: EmbeddedWallet = {
	metadata: {
		id: 'unrated',
		displayName: 'Unrated embedded wallet template',
		tableName: 'Unrated',
		blurb: paragraph(`
			This is a fictitious embedded wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
		contributors: [exampleContributor],
		iconExtension: 'svg',
		lastUpdated: '2020-01-01',
		urls: {
			docs: ['https://example.com/docs'],
			extensions: ['https://example.com/extensions'],
			repositories: ['https://example.com/repo'],
			socials: {
				discord: 'https://discord.com/example',
				farcaster: 'https://farcaster.xyz/example',
				linkedin: 'https://linkedin.com/example',
				telegram: 'https://telegram.org/example',
				x: 'https://x.com/example',
			},
			websites: ['https://example.com'],
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
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.EMBEDDED]: true,
	},
}
