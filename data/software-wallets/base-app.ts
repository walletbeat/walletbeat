import { ren2140 } from '@/data/contributors/ren2140'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import type { ContractTransactionWarning } from '@/schema/features/security/scam-alerts'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
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
			permissionsManagement: null,
			// Base App is mobile-only and closed-source. It does not ship its own
			// Ethereum P2P (devp2p) stack, transactions
			// are broadcast via Coinbase's RPC infrastructure. Users cannot configure
			// a custom RPC endpoint (chainConfigurability: notSupported above), so
			// there is no path to self-broadcast via a self-hosted node either.
			// For L2s: Base + Optimism (OP Stack) and Arbitrum are supported. No in-app force-inclusion UI for any L2, users
			// would need to interact with L1 bridge contracts directly.
			transactionSubmission: {
				l1: {
					ref: {
						explanation:
							"Base App and base/account-sdk are both built by Coinbase. The SDK (open-source) handles dApp-initiated transactions for Base accounts and uses viem's HTTP RPC transport — it does not implement Ethereum's devp2p protocol. It is reasonable to infer the closed-source Base App mobile binary uses the same approach for its native send/swap features: mobile platform constraints make running a devp2p node impractical, and Coinbase has never advertised doing so. URL pinned to the SDK's HTTP RPC fallback logic.",
						url: 'https://github.com/base/account-sdk/blob/24ab30c1a42a66bde605a43b1a60045b2fd19fec/packages/account-sdk/src/store/chain-clients/utils.ts',
					},
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					ref: {
						explanation:
							'Per the open-source base/account-sdk that backs Base App account flows, SUPPORTED_MAINNET_CHAINS includes Base, Optimism (both OP Stack), Arbitrum, Ethereum mainnet, Polygon, Avalanche, BSC, and Zora. The Base App mobile UI confirms multi-L2 support but exposes no force-inclusion flow.',
						url: 'https://github.com/base/account-sdk/blob/24ab30c1a42a66bde605a43b1a60045b2fd19fec/packages/account-sdk/src/store/chain-clients/utils.ts',
					},
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
