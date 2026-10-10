import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { iamkio } from '../contributors/iamkio'
import { minimalsm } from '../contributors/minimalsm'
import { kernal7702Contract } from '../wallet-contracts/kernal-7702'

export const pillarx: SoftwareWallet = {
	metadata: {
		id: 'pillarx',
		displayName: 'PillarX',
		tableName: 'PillarX',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [iamkio, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			websites: ['https://pillarx.app'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eip7702: supported({
				ref: {
					explanation: 'PillarX supports EIP-7702',
					url: 'https://pillarx.app/login',
				},
				contract: kernal7702Contract,
			}),
			// BIP support is not verified
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: false,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: notSupported,
		},
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
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
				'1193': notSupported,
				'2700': notSupported,
				'6963': notSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'PillarX is licensed under the MIT license',
						url: 'https://github.com/pillarwallet/x/blob/43b3392ad3379a04bbe64318143f1df1d5208c70/LICENSE',
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Pillar raised 113,674 ETH (about $21M) in a July 2017 token sale.',
					url: 'https://www.financemagnates.com/cryptocurrency/news/pillar-ico-raises-21-million-little-help-bitcoin-whales/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: true,
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: notSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://pillarx.app/privacy-policy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: notSupportedWithRef({
				ref: {
					explanation:
						'No active bug bounty covers PillarX: the former bug bounty page for Pillar returns 404, no HackerOne team exists, there is no SECURITY.md or security.txt, and GitHub private vulnerability reporting is disabled.',
					label: 'PillarX repository',
					url: 'https://github.com/pillarwallet/x',
				},
			}),
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
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
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyAgeGate: null,
				dependencyLocking: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The web CI workflows install with `npm i` rather than `npm ci`, and the mobile CircleCI build runs `yarn install` without `--frozen-lockfile`, so committed lockfiles are not enforced.',
							url: 'https://github.com/pillarwallet/x/blob/00c986f4df58c4399341d2d241e55e98bac77e99/.github/workflows/unit-tests.yml',
						},
					],
				}),
				dependencySandboxing: notSupportedWithRef({
					ref: {
						explanation:
							'No LavaMoat or install-script allow list; `.npmrc` sets `ignore-scripts=false`.',
						url: 'https://github.com/pillarwallet/x/blob/00c986f4df58c4399341d2d241e55e98bac77e99/.npmrc',
					},
				}),
				dependencyVulnerabilityScanning: notSupportedWithRef({
					ref: {
						explanation:
							'Neither repository configures automated dependency vulnerability scanning.',
						url: 'https://github.com/pillarwallet/x/tree/00c986f4df58c4399341d2d241e55e98bac77e99/.github/workflows',
					},
				}),
				hasPublicChangelog: notSupportedWithRef({
					ref: {
						explanation:
							'The web repo has no releases or changelog; mobile GitHub releases stop at v3.29.9 (June 2024) and App Store notes are generic.',
						label: 'Pillar Wallet releases',
						url: 'https://github.com/pillarwallet/pillarwallet/releases',
					},
				}),
				hermeticBuilds: notSupported,
				repositoryChangeControls: {
					[Variant.BROWSER]: {
						ref: [
							{
								explanation:
									'Rule sets on main block deletion and force-pushes and require a pull request with one approving review; no required status checks or tag protection.',
								url: 'https://api.github.com/repos/pillarwallet/x/rules/branches/main',
							},
						],
						branchDeletionBlocked: true,
						forcePushBlocked: true,
						requiredChecks: false,
						requiredReview: true,
						tagsImmutable: false,
					},
					// Mobile repo branches are protected, but details are not visible to non-admins.
					[Variant.MOBILE]: null,
				},
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
