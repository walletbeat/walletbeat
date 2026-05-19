import { ren2140 } from '@/data/contributors/ren2140'
import { coinbase } from '@/data/entities/coinbase'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { CollectionPolicy } from '@/schema/features/privacy/data-collection'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
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
			// Confirmed in-app (Base App v29.94.123): neither ERC-7828
			// (donations.walletbeat.eth@optimism.eth) nor ERC-7831
			// (donations.walletbeat.eth:optimism:1) resolves in the Send recipient
			// field. No public documentation indicates support for either standard.
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
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
		// Base App has no UI for adding additional Ethereum addresses to a single
		// install — verified in-app (Base App v29.94.123). The wallet manages a
		// single account/address per install.
		multiAddress: notSupported,
		privacy: {
			// Per direct in-app check (Settings > Privacy & Security, Base App v29.94.123):
			// there is NO toggle to disable crash reporting, diagnostics, or usage
			// analytics. The only data-collection toggle is "Personalized Advertising"
			// (defaulted ON), which reduces ad-related data sharing but does not stop
			// the underlying analytics collection.
			analytics: {
				crashReports: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'Apple App Store privacy label declares "Diagnostics: Crash Data" and performance metrics are collected.',
							url: 'https://apps.apple.com/us/app/base-formerly-coinbase-wallet/id1278383455',
						},
						{
							explanation:
								'No opt-out exists in the Base App Privacy & Security settings as of v29.94.123.',
							url: 'https://wallet.coinbase.com/privacy-policy',
						},
					],
					entity: coinbase,
					policy: CollectionPolicy.ALWAYS,
				}),
				usage: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'Apple App Store privacy label declares Product Interaction (usage data) is collected and linked to identity, used for external advertising, developer advertising/marketing, AND analytics. The in-app "Personalized Advertising" toggle (defaulted ON) reduces advertising-related sharing but does not stop the underlying usage analytics collection.',
							url: 'https://apps.apple.com/us/app/base-formerly-coinbase-wallet/id1278383455',
						},
						{
							explanation:
								'Coinbase privacy policy: in the past 12 months, Coinbase has disclosed identifiers with external analytics providers and advertising partners.',
							url: 'https://wallet.coinbase.com/privacy-policy',
						},
					],
					entity: coinbase,
					policy: CollectionPolicy.ALWAYS,
				}),
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://wallet.coinbase.com/dapp-privacy-policy',
			// Base App ships no built-in privacy features as of v29.94.123. Default
			// transfers are public ERC-20 / ETH sends on Base. Coinbase has signaled
			// future work on private transactions (Iron Fish acquisition, March 2025),
			// but no stealth address, Railgun, Privacy Pools, or Tornado Cash Nova
			// integration is in the app today. Confirmed by direct app testing.
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
			// Verified in-app (Base App v29.94.123):
			// - No app-level PIN, password, biometric toggle, or pattern lock.
			//   Opening the app does not require any authentication.
			// - Face ID / biometric IS required before signing transactions (this is
			//   the passkey unlock, not an app-level lock — gated per-action rather
			//   than at app launch).
			// - No duress credential, decoy mode, or emergency wipe feature.
			// Per the schema: "Set to 'NO_LOCK_MECHANISM' if the wallet has no lock
			// screen at all."
			duressResistance: {
				basicUnlock: 'NO_LOCK_MECHANISM',
				duressMode: notSupported,
			},
			hardwareWalletSupport: null,
			// New passkey accounts (rawErc4337 default): WebAuthn passkey generated in
			// the device secure enclave (iOS) / Android Keystore. Legacy 12-word-phrase
			// accounts: BIP39 seed phrase generated locally. Both paths fall under
			// FULLY_ON_USER_DEVICE / NON_MULTIPARTY — keys never leave the device
			// during generation, and there is no key-splitting or threshold scheme.
			keysHandling: {
				ref: [
					{
						explanation:
							'Per Coinbase Help, Smart Wallet passkeys are stored on the device (in the platform passkey store backed by iOS Secure Enclave or Android Keystore). The user retains control of the device-bound credential.',
						url: 'https://help.coinbase.com/en/wallet/getting-started/smart-wallet-passkeys',
					},
					{
						explanation:
							'Per Coinbase Help, legacy 12-word recovery phrase accounts are generated on-device using BIP39; the seed phrase is shown only to the user and stored locally.',
						url: 'https://help.coinbase.com/en/wallet/managing-account/wallet-recovery-phrase',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
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
							'Per the open-source base/account-sdk that backs Base App account flows, SUPPORTED_MAINNET_CHAINS includes Base, Optimism (both OP Stack), Arbitrum, and Ethereum mainnet (plus several other major chains). The Base App mobile UI confirms multi-L2 support but exposes no force-inclusion flow.',
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
