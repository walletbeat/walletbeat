import { ren2140 } from '@/data/contributors/ren2140'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const uniswapWallet: SoftwareWallet = {
	metadata: {
		id: 'uniswap-wallet',
		displayName: 'Uniswap Wallet',
		tableName: 'Uniswap',
		blurb: paragraph(`
			The self-custody wallet for swapping, sending, bridging,
			and exploring apps across 16+ networks.
		`),
		contributors: [ren2140],
		iconExtension: 'svg',
		lastUpdated: '2026-04-04',
		urls: {
			docs: ['https://docs.uniswap.org/'],
			extensions: [
				'https://chromewebstore.google.com/detail/uniswap-extension/nnpmfplkfogfpmcngplhnbdnnilmcdcg',
			],
			repositories: ['https://github.com/Uniswap'],
			socials: {
				discord: 'https://discord.com/invite/uniswap',
				farcaster: 'https://farcaster.xyz/uniswap',
				x: 'https://x.com/Uniswap',
			},
			websites: ['https://wallet.uniswap.org/'],
		},
	},
	features: {
		accountSupport: null,
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': null,
				'2700': null,
				'6963': null,
			},
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation:
						'The Uniswap Wallet mobile app is explicitly licensed under GPL 3.0 or later. The browser extension directory in the same monorepo does not contain a `LICENSE` file. Development happens in a private repository and only production-ready code is published.',
					url: 'https://github.com/Uniswap/interface/blob/64ff3de5ac6c4840ca6b32947b3529aea49930cc/apps/mobile/LICENSE',
				},
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Uniswap Labs raised $165M in a Series B led by Polychain Capital in October 2022, with participation from a16z, Paradigm, SV Angel, and Variant, at a $1.66B valuation. Total funding across all rounds is approximately $176M.',
					url: 'https://techcrunch.com/2022/10/13/uniswap-labs-raises-165-million-in-new-funding/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: true,
				hiddenConvenienceFees: null,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: true,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy:
				'https://support.uniswap.org/hc/en-us/articles/30934457771405-Uniswap-Labs-Privacy-Policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported({
				ref: [
					{
						explanation:
							'Uniswap Labs runs a bug bounty program through Cantina. The wallet mobile app and browser extension are in scope, with rewards up to $50K for critical wallet vulnerabilities.',
						url: 'https://cantina.xyz/bounties/f9df94db-c7b1-434b-bb06-d1360abdd1be',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE' as const,
				dateStarted: '2024-11-26' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.CANTINA,
				rewards: supported({
					currency: 'USD',
					maximum: 50000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
