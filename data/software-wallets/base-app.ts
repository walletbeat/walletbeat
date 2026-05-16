import { ren2140 } from '@/data/contributors/ren2140'
import { coinbaseEip7702ProxyContract } from '@/data/wallet-contracts/coinbase-eip7702-proxy'
import { coinbaseSmartWalletContract } from '@/data/wallet-contracts/coinbase-smart-wallet'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type { ContractTransactionWarning } from '@/schema/features/security/scam-alerts'
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
			// New signups create passkey-based ERC-4337 Smart Wallets per https://docs.base.org/base-account/overview/what-is-base-account.
			// Legacy 12-word-recovery-phrase users still hold EOAs; Coinbase is migrating them to Base Accounts.
			defaultAccountType: AccountType.rawErc4337,
			eip7702: supported({
				ref: {
					explanation:
						'Legacy Base App EOA users can be upgraded to smart-wallet behavior via EIP-7702 delegation to the EIP7702Proxy (an ERC-1967 proxy whose implementation can be set to the Coinbase Smart Wallet). The delegation is sponsored by Coinbase on Base mainnet and is performed transparently as part of dApp interactions; there is no user-facing "upgrade my account" UI in the Base App. Per the Base team questionnaire response (2026-03-13), accounts are "EOA + 7702 delegation / 4337".',
					url: 'https://blog.base.dev/securing-eip-7702-upgrades',
				},
				contract: coinbaseEip7702ProxyContract,
			}),
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
			rawErc4337: supported({
				ref: {
					explanation:
						'Base Accounts are ERC-4337 Smart Wallets created via passkey signup. The user is sole owner by default (passkey held in device secure enclave); Coinbase does not hold a co-owner key per https://wallet.coinbase.com/terms-of-service. The underlying contract supports multi-owner via addOwner/removeOwnerAtIndex, but as of Base App v29.94.123 the mobile app does not expose any passkey or owner management UI (Account Management shows only Sign out). Optional recovery-key signup likely lives in keys.coinbase.com rather than the mobile app.',
					url: 'https://docs.base.org/base-account/overview/what-is-base-account',
				},
				contract: coinbaseSmartWalletContract,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration: TransactionGenerationCapability.RELYING_ON_EXTERNAL_API,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_PROPRIETARY_STANDALONE_APP,
			}),
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
			passkeyVerification: supported({
				ref: {
					explanation:
						'Coinbase Smart Wallet verifies passkey signatures on-chain via webauthn-sol, which uses the RIP-7212 precompile when available and falls back to FreshCryptoLib.',
					url: 'https://github.com/coinbase/smart-wallet/blob/0fe87f18488fa89b792896d79de3200242778a68/src/CoinbaseSmartWallet.sol',
				},
				details:
					'Uses base-org/webauthn-sol (built on Daimo WebAuthn.sol). Tries RIP-7212 P-256 precompile first, falls back to FreshCryptoLib.',
				library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
				libraryUrl: 'https://github.com/base-org/webauthn-sol',
			}),
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
