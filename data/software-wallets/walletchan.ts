import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const walletchan: SoftwareWallet = {
	metadata: {
		id: 'walletchan',
		displayName: 'WalletChan',
		tableName: 'WalletChan',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm],
		iconExtension: 'png',
		lastUpdated: '2026-10-18',
		urls: {
			docs: ['https://docs.walletchan.com'],
			others: [
				{
					label: 'Chrome Web Store',
					url: 'https://chromewebstore.google.com/detail/walletchan/kofbkhbkfhiollbhjkbebajngppmpbgc',
				},
				{
					label: 'Firefox Add-ons',
					url: 'https://addons.mozilla.org/en-US/firefox/addon/walletchan/',
				},
			],
			repositories: ['https://github.com/walletchan/walletchan'],
			socials: {
				x: 'https://x.com/walletchan_',
			},
			websites: ['https://walletchan.com'],
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
				ref: [
					{
						explanation:
							'WalletChan announces itself to apps with EIP-6963. It also sets the standard provider object that older apps look for.',
						label: 'WalletChan provider announcement code',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/announcement.ts#L7-L58',
					},
					{
						explanation:
							'The provider offers the EIP-1193 request method and sends connect, account change and network change events.',
						label: 'WalletChan provider code',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/provider.ts#L22-L79',
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'The WalletChan browser extension code uses the GPL-3.0 license.',
						label: 'WalletChan extension license file',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/LICENSE.md#L5-L7',
					},
					{
						explanation:
							'The repository license file confirms that the extension code is under GPL-3.0.',
						label: 'WalletChan repository license file',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/LICENSE.md#L3-L12',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
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
		multiAddress: supported({
			ref: [
				{
					explanation:
						"The account switcher lists the user's accounts and lets the user pick one or add another.",
					label: 'WalletChan account switcher code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/components/AccountSwitcher.tsx#L15-L26',
				},
				{
					explanation:
						'WalletChan holds many accounts of different types, such as private key, seed phrase, Ledger, and Safe accounts.',
					label: 'WalletChan account types',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/IMPLEMENTATION.md#L5-L17',
				},
			],
		}),
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy:
				'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/PRIVACY_POLICY.md',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'WalletChan works with Ledger devices in Chrome and other Chromium browsers. The Firefox version does not offer Ledger.',
						label: 'WalletChan Ledger support',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/LEDGER.md#L1-L3',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webHID],
					}),
				},
			},
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
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: supported({
					ref: {
						explanation: 'WalletChan keeps a public list of changes to its browser extension.',
						label: 'WalletChan changelog',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/CHANGELOG.md#L1-L7',
					},
				}),
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: [
				{
					explanation:
						'Private key and seed phrase accounts report atomic batch support on each network where WalletChan can run the batch as a single transaction.',
					label: 'WalletChan batch capability code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/batch/batchCapabilities.ts#L61-L105',
				},
				{
					explanation:
						'On networks with EIP-7702, such as Ethereum, WalletChan upgrades the account with a default smart account contract if it has none.',
					label: 'WalletChan smart account selection code',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/utils/delegationResolution.ts#L11-L17',
				},
			],
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
