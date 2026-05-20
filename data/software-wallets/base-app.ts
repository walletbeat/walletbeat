import { ren2140 } from '@/data/contributors/ren2140'
import { cantina } from '@/data/entities/cantina'
import { certora } from '@/data/entities/certora'
import { code4rena } from '@/data/entities/code4rena'
import { coinbase } from '@/data/entities/coinbase'
import { coinbaseEip7702ProxyContract } from '@/data/wallet-contracts/coinbase-eip7702-proxy'
import { coinbaseSmartWalletContract } from '@/data/wallet-contracts/coinbase-smart-wallet'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { CollectionPolicy } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type { ContractTransactionWarning } from '@/schema/features/security/scam-alerts'
import { SpendingApprovalsControl } from '@/schema/features/self-sovereignty/permissions-management'
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
			// New accounts created via passkey onboarding are ERC-4337 Smart Wallets per https://docs.base.org/base-account/overview/what-is-base-account.
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
						'Base Accounts are ERC-4337 Smart Wallets created via passkey onboarding. The user is sole owner by default (passkey held in device secure enclave); Coinbase does not hold a co-owner key per https://wallet.coinbase.com/terms-of-service. The underlying contract supports multi-owner via addOwner/removeOwnerAtIndex, but as of Base App v29.94.123 the mobile app does not expose any passkey or owner management UI (Account Management shows only Sign out). Optional recovery-key setup likely lives in keys.coinbase.com rather than the mobile app.',
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
		// Coinbase is the parent company funding Base App development. Public via
		// direct listing on Nasdaq (COIN, April 2021), so publicOffering captures
		// the public-equity-funded nature. Base App's in-app swap UI displays a
		// separate Coinbase-attributed fee, so transparentConvenienceFees applies.
		// No governance token tied to Base App or Coinbase. SEC filings provide
		// public revenue breakdown.
		monetization: {
			ref: 'https://www.sec.gov/edgar/browse/?CIK=0001679788',
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: true,
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: false,
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
			// Base App exposes no UI for adding, pairing, or managing hardware wallet keys
			// and there are no settings for Ledger, Trezor, or other hardware devices.
			// There is also nothing in the Base App documentation that indicates support
			// for hardware wallets.
			hardwareWalletSupport: {
				ref: refNotNecessary,
				wallets: {},
			},
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
			// Audits cover the Coinbase Smart Wallet contracts that power Base App passkey-created accounts.
			// Legacy 12-word-recovery-phrase accounts are EOAs and out of scope for these audits.
			publicSecurityAudits: [
				{
					ref: 'https://github.com/coinbase/smart-wallet/blob/0fe87f18488fa89b792896d79de3200242778a68/audits/Cantina-December-2023.pdf',
					auditDate: '2024-01-07',
					auditor: cantina,
					codeSnapshot: {
						commit: '2779bed4',
						date: '2023-12-11',
					},
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.MOBILE]: true },
				},
				{
					ref: 'https://github.com/coinbase/smart-wallet/blob/0fe87f18488fa89b792896d79de3200242778a68/audits/Certora-February-2024.pdf',
					auditDate: '2024-02-29',
					auditor: certora,
					codeSnapshot: {
						commit: '7aa092a',
						date: '2024-02-08',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.MOBILE]: true },
				},
				{
					ref: 'https://code4rena.com/reports/2024-03-coinbase',
					auditDate: '2024-05-01',
					auditor: code4rena,
					codeSnapshot: {
						date: '2024-03-14',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.MOBILE]: true },
				},
				{
					ref: 'https://github.com/coinbase/smart-wallet/blob/0fe87f18488fa89b792896d79de3200242778a68/audits/Cantina-April-2024.pdf',
					auditDate: '2024-04-23',
					auditor: cantina,
					codeSnapshot: {
						commit: '9edcf7f1',
						date: '2024-04-15',
					},
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.MOBILE]: true },
				},
			],
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
			// Base App is closed-source; no public URL hosts the AndroidManifest.xml
			// or Info.plist, so the `pnpm collect:manifests` tool cannot fetch them.
			// Filling this out requires manually extracting the manifests from the
			// published APK/IPA. What we know without extraction: for new passkey
			// accounts (the smart-wallet path), keyStorageMechanism would be
			// PASSKEY_MANAGED — the WebAuthn passkey lives in the iOS Secure
			// Enclave or Android Keystore and no private key is stored by the app.
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			// Base App exposes in-app ERC-20 token approval management via a "Token
			// Approvals" screen (verified in-app, Base App v29.94.123). Users can
			// inspect and revoke individual approvals directly in the wallet UI,
			// across multiple chains. The screen
			// covers traditional ERC-20 token.approve() allowances and Permit2-style
			// allowances. NFT (ERC-721 / ERC-1155) approvals are NOT surfaced in this
			// view.
			permissionsManagement: supported({
				ref: refTodo,
				erc1155Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
				erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				erc721Approvals: SpendingApprovalsControl.CANNOT_INSPECT,
			}),
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
