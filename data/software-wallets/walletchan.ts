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
		lastUpdated: '2026-10-09',
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
							'WalletChan announces its provider via EIP-6963 (`eip6963:announceProvider`, answering `eip6963:requestProvider`) and sets the legacy `window.ethereum` global.',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/announcement.ts#L7-L57',
					},
					{
						explanation:
							'The injected provider exposes the EIP-1193 `request` method and is an `EventEmitter` that emits `connect`, `accountsChanged` and `chainChanged`.',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/src/chrome/provider/inpage/provider.ts#L22-L80',
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
						explanation:
							'The WalletChan browser extension source (apps/extension) and its releases from v4.0.0 onward are licensed under GPL-3.0-only. Other components of the monorepo (website, docs, shared packages) remain MIT.',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/apps/extension/LICENSE.md',
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
		multiAddress: featureSupported,
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
							'WalletChan supports Ledger hardware accounts in Chromium browsers over WebHID. Firefox builds do not offer Ledger setup.',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/LEDGER.md',
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
						explanation:
							'The repository keeps a Keep a Changelog-format CHANGELOG.md for the browser extension.',
						url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/CHANGELOG.md',
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
						'WalletChan implements ERC-5792 (`wallet_sendCalls`, `wallet_getCapabilities`). Private-key and seed-phrase accounts batch atomically via EIP-7702 + ERC-7821 when a compatible delegate resolves, and Bankr accounts batch atomically; Ledger and view-only accounts do not advertise the capability.',
					url: 'https://github.com/walletchan/walletchan/blob/47650cc1e0aaec867422537683fd900b2299b6bb/_docs/ERC5792.md#L5-L15',
				},
			],
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
