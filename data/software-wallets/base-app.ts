import { ren2140 } from '@/data/contributors/ren2140'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import type { ContractTransactionWarning } from '@/schema/features/security/scam-alerts'
import { SpendingApprovalsControl } from '@/schema/features/self-sovereignty/permissions-management'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { comprehensiveFeesShownByDefault } from '@/schema/features/transparency/fee-display'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const baseApp: SoftwareWallet = {
	metadata: {
		id: 'base-app',
		displayName: 'Base App',
		tableName: 'Base App',
		blurb: paragraph(`
			Base is a secure onchain wallet and browser that puts you in
			control of your crypto, NFTs, DeFi activity, and digital assets.
		`),
		contributors: [ren2140],
		iconExtension: 'png',
		lastUpdated: '2026-03-19',
		urls: {
			docs: ['https://docs.base.org/get-started/base'],
			extensions: [],
			repositories: [
				'https://github.com/coinbase/smart-wallet',
				'https://github.com/base/account-sdk',
			],
			socials: {
				discord: 'https://discord.com/invite/buildonbase',
				farcaster: 'https://farcaster.xyz/baseapp.base.eth',
				x: 'https://x.com/baseapp',
			},
			websites: ['https://base.app/', 'https://wallet.coinbase.com/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: 'https://help.coinbase.com/en/wallet/managing-account/wallet-recovery-phrase',
				canExportPrivateKey: true,
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
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: comprehensiveFeesShownByDefault,
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo, // Source: Base team responses via Fileverse questionnaire (Q7, Q8, Q9)
				ether: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
			},
		},
		chainConfigurability: notSupported,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: refNotNecessary,
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: 'https://www.sec.gov/edgar/browse/?CIK=0001679788',
			revenueBreakdownIsPublic: true,
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
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://wallet.coinbase.com/dapp-privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported({
				ref: 'https://hackerone.com/coinbase?type=team',
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE' as const,
				dateStarted: '2014-02-14' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.HACKER_ONE,
				rewards: supported({
					currency: 'USD',
					maximum: 1000000,
					minimum: 200,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported<ContractTransactionWarning>({
					ref: refTodo,
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
				}),
				scamUrlWarning: null,
				sendTransactionWarning: notSupported,
			},
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			// Coinbase Smart Wallet supports "Spend Permissions" — a Coinbase-specific
			// mechanism where the SpendPermissionManager contract is added as a wallet
			// owner. The contract is immutable (no proxy, no upgrade path) and has no
			// admin role, so Coinbase cannot retroactively change its behavior or push
			// malicious updates; spending is bounded by amounts the user has
			// cryptographically signed. dApps request recurring spending authority on
			// the user's native ETH or ERC-20 tokens with amount + frequency + duration
			// semantics, gated by a passkey signature. NFT (ERC-721 / ERC-1155)
			// approvals are architecturally excluded from this design for security
			// reasons. Inspection and revocation of Spend Permissions is possible via
			// the Base Account web dashboard at keys.coinbase.com (Settings > Settings
			// for your Base Account > Manage permissions), NOT in the Base mobile app
			// itself. Traditional ERC-20 approve() allowances granted via legacy paths
			// are not shown in the dashboard and must be revoked using external tools
			// (e.g. revoke.cash).
			permissionsManagement: supported({
				ref: [
					{
						explanation:
							'Coinbase Smart Wallet exposes inspection and revocation for "Spend Permissions" (a Coinbase-specific recurring-allowance mechanism for native ETH and ERC-20 tokens) via the Base Account web dashboard. The SpendPermissionManager contract added as a wallet owner is immutable and has no admin role, so Coinbase cannot retroactively change its behavior — spending is constrained to amounts the user has cryptographically signed. Traditional ERC-20 approve() allowances and NFT approvals are not covered. The Base mobile app does not surface this UI directly; users are linked out to the web flow.',
						url: 'https://help.coinbase.com/en/wallet/getting-started/smart-wallet-permissions',
					},
					{
						explanation:
							'SpendPermissionManager source code: contract is immutable (no proxy, no upgrade mechanism), has no onlyOwner / onlyAdmin functions, and spend() can only be called by the spender designated in a user-signed permission. Coinbase has no privileged role on this contract.',
						url: 'https://github.com/coinbase/spend-permissions/blob/e0004e63edc4e17de7aa978293800ac7a16892e5/src/SpendPermissionManager.sol',
					},
				],
				erc1155Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
				erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				erc721Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
			}),
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
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
