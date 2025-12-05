import { exampleContributor } from '@/data/contributors/example'
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

export const unratedHardwareTemplate: HardwareWallet = {
	metadata: {
		id: 'unrated',
		displayName: 'Unrated hardware wallet template',
		tableName: 'Unrated',
		blurb: paragraph(`
			This is a fictitious hardware wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
		contributors: [exampleContributor],
		iconExtension: 'svg',
		lastUpdated: '2020-01-01',
		urls: {
			docs: ['https://example.com/docs'],
			extensions: ['https://example.com/extensions'],
			others: [
				{
					label: 'Other',
					url: 'https://example.com/other',
				},
			],
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
			hardwarePrivacy: null,
			privacyPolicy: 'https://example.com/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2024-01-01' as CalendarDate,
				disclosure: supported({
					numberOfDays: 30,
				}),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation: 'Sample Reference',
							url: 'https://example.com',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			firmware: null,
			hardwareWalletAppSigning: null,
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
