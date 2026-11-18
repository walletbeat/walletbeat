import { alexanderchopan } from '@/data/contributors/alexanderchopan'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import {
	FeeDisplayLevel,
	FeeType,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { nonEmptySet } from '@/types/utils/non-empty'

const source =
	'https://github.com/alexanderchopan/casberi/blob/b7789bb29e48277dffd6f4871ce7d61c42b8a9dd'

export const casberi: SoftwareWallet = {
	metadata: {
		id: 'casberi',
		displayName: 'Casberi',
		tableName: 'Casberi',
		coinspectId: null,
		contributors: [alexanderchopan],
		iconExtension: 'svg',
		lastUpdated: '2026-11-18',
		urls: {
			docs: ['https://casberi.app/docs.html'],
			repositories: ['https://github.com/alexanderchopan/casberi'],
			socials: {
				x: 'https://x.com/casberi_app',
			},
			websites: ['https://casberi.app'],
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
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'Casberi is licensed under GPL-3.0-or-later, with a section 7 additional permission for linking the `reown-swift` library.',
						label: 'Casberi license',
						url: `${source}/LICENSE#not-line-specific`,
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Swaps are written on the device against the Uniswap, Aerodrome and Sushi routers. No fee recipient, partner fee or referral code is added to a swap.',
					label: 'Swap calls built on the device with no wallet fee',
					url: `${source}/Casberi/Casberi/Model/YourAccountSwap.swift#L3-L30`,
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: false,
				ventureCapital: false,
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: notSupported,
				usage: notSupported,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://casberi.app/privacy.html',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: [],
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
			operationFees: {
				builtInErc20Swap: supported({
					ref: [
						{
							explanation:
								'A swap shows the network fee as a ceiling in dollars and names the venue with its pool fee as a percentage. No wallet fee is charged.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
						},
					],
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: true,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
						},
					},
				}),
				erc20L1Transfer: supported({
					ref: [
						{
							explanation:
								'A send shows the network fee before signing as a ceiling in dollars, or in ETH when no price is known.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
						},
					],
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				ethL1Transfer: supported({
					ref: [
						{
							explanation:
								'A send shows the network fee before signing as a ceiling in dollars, or in ETH when no price is known.',
							label: 'Fee wording for sends and swaps',
							url: `${source}/Casberi/Casberi/Model/YourAccountPreview.swift#L36-L46`,
						},
					],
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				uniswapUSDCToEtherSwap: null,
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: supported({
					ref: [
						{
							label: 'Swift package versions pinned in Package.resolved',
							url: `${source}/Casberi/Casberi.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved#not-line-specific`,
						},
					],
				}),
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: supported({
					ref: {
						explanation:
							'The changelog lists the release notes for each App Store version from 3.0.28 on. Earlier versions are reconstructed from the repository and say so.',
						label: 'Casberi changelog',
						url: 'https://github.com/alexanderchopan/casberi/blob/05cc3fcfb91e773fa3e8c2c8060565cf6213a95e/CHANGELOG.md#not-line-specific',
					},
				}),
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
