import { minimalsm } from '@/data/contributors/minimalsm'
import type { EmbeddedWallet } from '@/data/embedded-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramSupport,
} from '@/schema/features/security/bug-bounty-program'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'

export const privy: EmbeddedWallet = {
	metadata: {
		id: 'privy',
		displayName: 'Privy',
		tableName: 'Privy',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://docs.privy.io'],
			socials: {
				farcaster: 'https://farcaster.xyz/privy',
				linkedin: 'https://www.linkedin.com/company/privyio',
				x: 'https://x.com/privy_io',
			},
			websites: ['https://www.privy.io'],
		},
	},
	features: {
		accountSupport: null,
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The client SDK packages declare the Apache-2.0 license on npm but ship only minified build output, with no linked source repository.',
						url: 'https://www.npmjs.com/package/@privy-io/react-auth',
					},
					{
						explanation:
							'Keys are generated and reconstructed inside AWS Nitro Enclaves running Privy code. Publishing attestation documents and measurements for that code is listed as coming soon.',
						url: 'https://docs.privy.io/security/wallet-infrastructure/secure-enclaves',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Series A led by Paradigm, with participation from existing investors.',
					url: 'https://www.privy.io/blog/series-a-announcement',
				},
				{
					explanation:
						'Venture round announced in March 2025, with participation from Sequoia Capital, Paradigm, and Coinbase.',
					url: 'https://www.privy.io/blog/announcing-our-fundraise-led-by-ribbit-capital',
				},
			],
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
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			privacyPolicy: 'https://www.privy.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramSupport>({
				ref: {
					explanation:
						'Public HackerOne program covering the authentication, API, dashboard, and recovery services and the client SDK packages. The policy forbids discussing any vulnerability, even a resolved one, without consent, and has no safe harbor or legal assurance section.',
					url: 'https://hackerone.com/privy-bbp',
				},
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2024-02-02',
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.HACKER_ONE,
				rewards: supported({
					currency: 'USD',
					maximum: 10000,
					minimum: 500,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: supported({
					ref: {
						explanation: 'Per-version release notes for the React SDK.',
						url: 'https://docs.privy.io/changelogs/react-auth',
					},
				}),
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
	},
	variants: {
		[Variant.EMBEDDED]: true,
	},
}
