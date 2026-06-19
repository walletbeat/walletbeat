import { mattmatt } from '@/data/contributors/0xmattmatt'
import { polymutex } from '@/data/contributors/polymutex'
import { alphabet } from '@/data/entities/alphabet'
import { apple } from '@/data/entities/apple'
import { rainbow as rainbowEntity } from '@/data/entities/rainbow'
import { sentry } from '@/data/entities/sentry'
import { rainbowCaliburContract } from '@/data/wallet-contracts/rainbow-calibur'
import type { WalletAnalytics } from '@/schema/features'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	ExposedAccountsBehavior,
	type ExposedAccountSet,
} from '@/schema/features/privacy/app-isolation'
import { CollectionPolicy } from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { GuardianPolicyType, GuardianType } from '@/schema/features/security/account-recovery'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { parseMobileManifestJson } from '@/tools/manifest-collector/mobile-manifest-parser'
import { paragraph } from '@/types/content'

import rainbowAndroidParsed from './manifests/rainbow/android.parsed.json'
import rainbowIosParsed from './manifests/rainbow/ios.parsed.json'
import rainbowRawExtManifest from './manifests/rainbow/opfgelmcmbiajamepnmloijbpoleiama.manifest.json'

export const rainbow: SoftwareWallet = {
	metadata: {
		id: 'rainbow',
		displayName: 'Rainbow',
		tableName: 'Rainbow',
		blurb: paragraph(`
			Rainbow Extension. Built for speed. Built for power. Built for You.
		`),
		contributors: [polymutex, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2026-05-11',
		urls: {
			androidManifestXml:
				'https://raw.githubusercontent.com/rainbow-me/rainbow/develop/android/app/src/main/AndroidManifest.xml',
			docs: ['https://rainbowkit.com/'],
			extensions: [
				'https://chromewebstore.google.com/detail/rainbow/opfgelmcmbiajamepnmloijbpoleiama',
			],
			iosInfoPlist:
				'https://raw.githubusercontent.com/rainbow-me/rainbow/develop/ios/Rainbow/Info.plist',
			repositories: [
				'https://github.com/rainbow-me/browser-extension',
				'https://github.com/rainbow-me/rainbow',
			],
			socials: {
				farcaster: 'https://farcaster.xyz/rainbow',
				x: 'https://x.com/rainbowdotme',
			},
			websites: ['https://rainbow.me'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			// Rainbow ships EIP-7702 "smart wallets": EOAs are delegated to Rainbow's
			// deployment of the Calibur delegate contract to batch approvals and actions
			// into a single transaction. Delegation is gated behind a feature flag /
			// remote config and applied lazily at the first operation that needs it.
			eip7702: supported({
				ref: [
					{
						explanation:
							'Rainbow announced EIP-7702 smart wallets that delegate EOAs to bundle approvals and actions into a single transaction.',
						url: 'https://x.com/rainbowdotme/status/2026753700216127820',
					},
					{
						explanation:
							'Both clients execute EIP-7702 (type-4) delegation as part of swap/send-calls flows via the @rainbow-me/delegation SDK; `willExecuteDelegation` decides per (address, chainId) whether the next operation delegates.',
						url: 'https://github.com/rainbow-me/rainbow/blob/a6caacc07ddad0d40554d647dc4414945c9ebb81/src/features/delegation/willDelegate.ts',
					},
				],
				contract: rainbowCaliburContract,
			}),
			eoa: supported({
				ref: refTodo,
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
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			// Chain abstraction was evaluated on the mobile app only; the browser
			// extension has not been tested for it yet.
			[Variant.BROWSER]: null,
			[Variant.MOBILE]: {
				bridging: {
					builtInBridging: supported({
						ref: [
							{
								explanation:
									'Rainbow has a built-in cross-chain bridge/swap feature. On the amount-entry screen only a gas estimate is shown by default (and "Hold to Bridge" is available there), so the fee shown by default is aggregated. Tapping "Review" (a single action) reveals the itemized breakdown: destination network, minimum received, the "Included Rainbow Fee", and max slippage as separate line items. The UI does not, however, explain the trust assumptions or risks of bridging across chains (no warning about external bridge providers, L2 risk, or possible loss of funds), and the Rainbow support documentation likewise omits these.',
								lastRetrieved: '2026-06-17',
								url: 'https://rainbow.me/support/app/bridge-and-swap-tokens',
							},
							{
								explanation:
									'Rainbow mobile app bridge amount-entry screen: by default only a gas estimate is shown (labelled "Free", roughly 0.0001 ETH), with the "Included Rainbow Fee" and slippage not visible. "Hold to Bridge" is available here, so a user can confirm without ever seeing the itemized fee.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-17-chain-abstraction-bridge-input-gas-only.jpg',
								label:
									'Rainbow mobile app screenshot of the bridge amount-entry screen showing only a gas estimate',
								lastRetrieved: '2026-06-17',
							},
							{
								explanation:
									'Rainbow mobile app bridge "Review" screen (reached by tapping "Review", one action): fees are itemized as the destination network, minimum received, "Included Rainbow Fee", and max slippage, with no warning explaining bridge trust assumptions or cross-chain risk.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-17-chain-abstraction-bridge-review-fees.jpg',
								label:
									'Rainbow mobile app screenshot of the bridge Review screen with itemized fees',
								lastRetrieved: '2026-06-17',
							},
						],
						feesLargerThan1bps: {
							afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
							byDefault: FeeDisplayLevel.AGGREGATED,
							fullySponsored: false,
						},
						risksExplained: 'NOT_IN_UI',
					}),
					// Sending more of a token on one chain than is held there, while
					// holding enough of it on another chain, just yields an "Insufficient
					// Funds" block rather than a prompt to bridge the shortfall
					// (USDC send on Polygon).
					suggestedBridging: notSupportedWithRef({
						ref: {
							explanation:
								'Rainbow mobile app Send screen: attempting to send 1 USDC on Polygon (0.50 USDC held there, but more held on another chain) shows an "Insufficient Funds" block, with no prompt to bridge the shortfall from the other chain.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-17-chain-abstraction-send-insufficient-funds.jpg',
							label:
								'Rainbow mobile app screenshot of the Send screen showing an Insufficient Funds block',
							lastRetrieved: '2026-06-17',
						},
					}),
				},
				crossChainBalances: {
					ref: [
						{
							explanation:
								'Rainbow displays a single portfolio total summing the account value across all supported chains, and lists per-chain token balances as separate line items (e.g. ETH held on mainnet and on an L2 each appear as their own row with a chain badge). It does not, however, sum a single token across chains into one combined balance: the same asset on multiple chains is shown as multiple rows rather than a single total.',
							lastRetrieved: '2026-06-17',
							url: 'https://rainbow.me/support/app/supported-networks',
						},
						{
							explanation:
								'Rainbow mobile app home screen: a single account-value total at the top, with ETH and WETH each appearing as separate per-chain rows (mainnet and an L2, distinguished by chain badges) rather than a single summed-per-token balance.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-17-chain-abstraction-portfolio-per-chain-balances.jpg',
							label:
								'Rainbow mobile app screenshot of the home screen showing per-chain token balances',
							lastRetrieved: '2026-06-17',
						},
					],
					ether: {
						crossChainSumView: notSupported,
						perChainBalanceViewAcrossMultipleChains: featureSupported,
					},
					globalAccountValue: featureSupported,
					perChainAccountValue: featureSupported,
					usdc: {
						crossChainSumView: notSupported,
						perChainBalanceViewAcrossMultipleChains: featureSupported,
					},
				},
			},
		},
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: refTodo,
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: featureSupported,
					erc20TokenSend: featureSupported,
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			}),
		}),
		ecosystem: {
			// Delegation is never offered at EOA creation or import; it is applied lazily,
			// bundled into the first operation (e.g. a swap) that benefits from it.
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					// The bundled swap/send is shown with its normal transaction details; the
					// delegation is carried alongside rather than replacing the operation UI.
					nonDelegationTransactionDetailsIdenticalToNormalFlow: true,
				}),
				fee: {
					// No evidence Rainbow lets the user pay the delegation gas with a token on
					// another chain.
					crossChainGas: notSupported,
					// Sponsored: prepared managed calls set `fees.payer: 'sponsor'`
					// (src/features/delegation/calls.ts) and are submitted via Rainbow's own relay
					// (relayService.ts, RAINBOW_RELAY_*). Sponsorship is gated on delegation —
					// `predictSponsoredCallsExecution` requires `canUseDelegatedExecution` — and
					// limited to sponsorship-eligible chains and the sponsor wallet's balance.
					walletSponsored: featureSupported,
				},
			},
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: notSupported,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Rainbow uses the GPL-3.0 license for its source code',
						label: 'Rainbow License File',
						url: 'https://github.com/rainbow-me/rainbow/blob/c26561eefb4251146db71e5b39f6f0b7233fa647/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			// Source: Rainbow team responses via Walletbeat questionnaire
			ref: [
				{
					explanation: 'Rainbow fee revenue data is publicly available on DeFiLlama.',
					url: 'https://defillama.com/protocol/fees/rainbow',
				},
				{
					explanation: 'Rainbow investor information is publicly available.',
					url: 'https://investors.rainbow.me/',
				},
				{
					explanation:
						'Rainbow raised an $18M Series A led by Seven Seven Six, following a $1.5M seed round.',
					url: 'https://techcrunch.com/2022/02/15/web3-mobile-wallet-startup-rainbow-raises-18m-series-a-from-alexis-ohanians-fund/',
				},
				{
					explanation:
						'Rainbow token has ~180M circulating of 1B total supply (~18% float) as of April 2026.',
					url: 'https://www.coingecko.com/en/coins/rainbow-3',
				},
			],
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: true, // ~180M circulating of 1B total supply (~18% float) per CoinGecko as of 2026 04 24
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: true, // Questionnaire: fees on perpetual futures and prediction markets are not explicitly displayed
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: true, // Questionnaire: swap review sheet shows fees
				ventureCapital: true, // $18M Series A led by Seven Seven Six, $1.5M seed including Y Combinator
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'Both Rainbow clients integrate Sentry for crash and error reporting. In the mobile app, `initSentry` runs in all production builds (disabled only for dev/test sessions).',
							url: 'https://github.com/rainbow-me/rainbow/blob/903d96e1075054ede51a721f5430b09c530fedf9/src/logger/sentry.ts',
						},
						{
							explanation:
								'The in-app Analytics toggle (Settings > Privacy) only disables usage analytics via `analytics.disable()`; it does not stop Sentry crash reporting.',
							url: 'https://github.com/rainbow-me/rainbow/blob/bcaa23256cdab40bea73a5bf89a232d8f13f9ac0/src/screens/SettingsSheet/components/PrivacySection.tsx',
						},
						{
							explanation:
								'In the browser extension, `initializeSentry` runs in all non-dev builds and is not gated by the analytics opt-out, so the user cannot disable crash reporting.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/566dbc30d057e007a6f05ca2694cc600683e4ae8/src/core/sentry/index.ts',
						},
						{
							explanation:
								'The in-app Privacy settings state that when the Analytics toggle is disabled, "only essential crash diagnostics are collected". Hence, crash reporting **cannot** be turned off by the user.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-08-privacy-analytics-settings.png',
							label: 'Rainbow mobile app privacy settings',
						},
					],
					entity: sentry,
					// Sentry crash reporting runs in all production builds of both clients and is
					// not gated by the in-app analytics opt-out, so users cannot disable it.
					policy: CollectionPolicy.ALWAYS,
				}),
				usage: supported<WalletAnalytics>({
					ref: [
						{
							explanation:
								'The mobile app collects product usage analytics via RudderStack; analytics default to enabled and are disabled only when the `doNotTrack` device flag is set.',
							url: 'https://github.com/rainbow-me/rainbow/blob/fa6b1e08a12d964cc82f61ff657ec586dd5086e5/src/analytics/index.ts',
						},
						{
							explanation:
								'The browser extension also collects usage analytics via RudderStack, enabled by default (gated by the `analyticsDisabled` setting).',
							url: 'https://github.com/rainbow-me/browser-extension/blob/b5da91cd683f1b9cdd2eb4a43b3b8314986cf1af/src/analytics/index.ts',
						},
						{
							explanation:
								'Usage analytics can be disabled by the user via the in-app Analytics toggle (Settings > Privacy), which calls `analytics.disable()` and sets `doNotTrack`.',
							url: 'https://github.com/rainbow-me/rainbow/blob/bcaa23256cdab40bea73a5bf89a232d8f13f9ac0/src/screens/SettingsSheet/components/PrivacySection.tsx',
						},
						{
							explanation:
								'The in-app Privacy settings describe the Analytics toggle as "allowing analytics of usage data", confirming it governs usage analytics collection.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-08-privacy-analytics-settings.png',
							label: 'Rainbow mobile app privacy settings',
						},
					],
					// Usage analytics is collected by Rainbow, implemented via the RudderStack
					// SDK. The data plane host is configured through a build-time environment
					// variable, so whether events also reach RudderStack as an external recipient
					// cannot be verified from the public source; collection is attributed to
					// Rainbow, the recipient we can confirm.
					entity: rainbowEntity,
					policy: CollectionPolicy.BY_DEFAULT,
				}),
			},
			appIsolation: {
				[Variant.BROWSER]: {
					// The connection flow only lets the user pick from existing
					// accounts; there is no option to create a fresh address for the app
					// being connected.
					createInAppConnectionFlow: notSupportedWithRef({
						ref: {
							explanation:
								'The Rainbow browser extension connection dialog only offers a "Switch Wallets" picker over existing accounts; it provides no option to create a new address as part of connecting to an app.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-18-app-isolation-connect-wallet-picker.png',
							label:
								'Rainbow browser extension connect dialog showing only an existing-wallet picker, no create option',
							lastRetrieved: '2026-06-18',
						},
					}),
					// The Walletbeat test page wallet_connect call returns an error
					// ("wallet may not support ERC-7846"), so Rainbow does not implement
					// the ERC-7846 privacy-preserving connection RPC.
					erc7846WalletConnect: notSupportedWithRef({
						ref: {
							explanation:
								'Calling wallet_connect (ERC-7846) from the Walletbeat test page against the Rainbow browser extension returns an error ("wallet may not support ERC-7846 / Request failed"), so Rainbow does not support the ERC-7846 privacy-preserving connection RPC.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-18-app-isolation-wallet-connect-unsupported.png',
							label:
								'Walletbeat test page showing Rainbow wallet_connect (ERC-7846) returning an error',
							lastRetrieved: '2026-06-18',
						},
					}),
					// On connect, Rainbow shows a single-account picker ("Switch
					// Wallets") that defaults to the currently active account, and
					// `eth_accounts` then returns only that one account. Switching the
					// active account in the wallet and reconnecting defaults the picker
					// to the new active account, confirming ACTIVE_ACCOUNT_ONLY.
					ethAccounts: supported<WithRef<ExposedAccountSet>>({
						ref: [
							{
								explanation:
									'Rainbow browser extension connection dialog: the "Wallet" field is a single-select "Switch Wallets" picker that defaults to the currently active account. Connecting exposes only that one account; tested against the Walletbeat test page, eth_accounts returned exactly the single selected account.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-18-app-isolation-eth-accounts-single.png',
								label:
									'Walletbeat test page showing Rainbow eth_accounts returning a single account',
								lastRetrieved: '2026-06-18',
							},
							{
								explanation:
									'Rainbow browser extension connection dialog with the wallet picker expanded: it is a single-select list of existing accounts ("Switch Wallets"), pre-highlighting the currently active account, with no option to expose more than one account.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-18-app-isolation-connect-wallet-picker.png',
								label:
									'Rainbow browser extension connect dialog with the single-select wallet picker expanded',
								lastRetrieved: '2026-06-18',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					// Reconnecting to a previously-connected app does not restore the
					// address used before: with a different account set active, the
					// connect dialog defaults to the active account, not the one the app
					// was last connected with.
					useAppSpecificLastConnectedAddresses: notSupportedWithRef({
						ref: {
							explanation:
								'After connecting the Rainbow browser extension to an app with one account, disconnecting, switching the active account in the wallet, and reconnecting to the same app, the connection dialog defaults to the now-active account rather than the previously-connected one. Rainbow does not remember the per-app last-connected address.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-18-app-isolation-connect-defaults-to-active-account.png',
							label:
								'Rainbow browser extension reconnect dialog defaulting to the active account, not the previously-connected one',
							lastRetrieved: '2026-06-18',
						},
					}),
				},
				[Variant.MOBILE]: {
					// The mobile connection sheet's account picker does surface an
					// "+ Add" button that can create a new wallet, but creating one exits
					// the connection flow back to the home screen instead of connecting
					// the app to the newly-created account. So a fresh address cannot be
					// created as part of the connection flow itself; the connection can
					// only be completed by selecting an existing account.
					createInAppConnectionFlow: notSupportedWithRef({
						ref: [
							{
								explanation:
									'The Rainbow mobile connection sheet exposes a single "Wallet" picker (alongside a network picker) with Cancel/Connect actions. Expanding the picker reveals the account list with an "+ Add" button.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-connect-sheet.png',
								label:
									'Rainbow mobile app connection sheet with the wallet picker and Connect action',
								lastRetrieved: '2026-06-19',
							},
							{
								explanation:
									'The expanded account picker inside the connection sheet does include an "+ Add" button that can create a new wallet. However, creating one leaves the connection flow and returns to the wallet home screen rather than connecting the app with the new account, so a fresh address cannot be created and used as part of the app connection flow; the connection can only be completed by selecting an existing account.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-connect-sheet-add-account.jpg',
								label:
									'Rainbow mobile connection sheet account picker expanded, showing the "+ Add" option among existing accounts',
								lastRetrieved: '2026-06-19',
							},
						],
					}),
					// The Walletbeat test page wallet_connect call (run in Rainbow's
					// in-app browser) returns an error, so mobile does not implement the
					// ERC-7846 privacy-preserving connection RPC either.
					erc7846WalletConnect: notSupportedWithRef({
						ref: {
							explanation:
								'Calling wallet_connect (ERC-7846) from the Walletbeat test page inside the Rainbow mobile app in-app browser returns an error ("wallet may not support ERC-7846 / Request failed"), so Rainbow mobile does not support the ERC-7846 privacy-preserving connection RPC.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-wallet-connect-unsupported.png',
							label:
								'Walletbeat test page in the Rainbow mobile in-app browser showing wallet_connect (ERC-7846) returning an error',
							lastRetrieved: '2026-06-19',
						},
					}),
					// Mobile exposes only a single account and live-tracks the active
					// account: the connection sheet defaults to the currently active
					// wallet, eth_accounts returns just that one account, and switching
					// the active account in-wallet pushes the new account to the
					// already-connected site without reconnecting. (This differs from the
					// browser extension, which stays pinned to the originally-connected
					// account until the user disconnects.)
					ethAccounts: supported<WithRef<ExposedAccountSet>>({
						ref: [
							{
								explanation:
									'Rainbow mobile in-app browser on the Walletbeat test page: with one account active, eth_accounts returns exactly that single account, never the full account list.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-eth-accounts-single.png',
								label:
									'Walletbeat test page in the Rainbow mobile in-app browser showing eth_accounts returning a single account',
								lastRetrieved: '2026-06-19',
							},
							{
								explanation:
									'Rainbow mobile connection sheet: a single "Wallet" picker that defaults to the currently active account ("Test"), so the account exposed to the app is whichever account is active in the wallet.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-connect-sheet.png',
								label:
									'Rainbow mobile connection sheet with the wallet picker defaulting to the active account',
								lastRetrieved: '2026-06-19',
							},
							{
								explanation:
									'Rainbow mobile after switching the active account in-wallet (from "Test" to "Test 2"): the already-connected test page\'s "Connected as" indicator updates on its own to the newly-active account, without reconnecting.',
								file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-eth-accounts-after-account-switch.png',
								label:
									'Walletbeat test page in the Rainbow mobile in-app browser, connected account following an in-wallet active-account switch',
								lastRetrieved: '2026-06-19',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					// Reconnecting to a previously-connected app does not restore the
					// address used before: the connection sheet defaults to the currently
					// active account, not the one the app was last connected with.
					useAppSpecificLastConnectedAddresses: notSupportedWithRef({
						ref: {
							explanation:
								'After connecting the Rainbow mobile app to an app with one account, disconnecting, switching the active account in the wallet, and reconnecting to the same app, the connection sheet defaults to the now-active account rather than the previously-connected one. Rainbow mobile does not remember the per-app last-connected address.',
							file: 'public/references/wallets/rainbow/screenshots/2026-06-19-app-isolation-mobile-connect-sheet.png',
							label:
								'Rainbow mobile connection sheet defaulting to the active account rather than a remembered per-app address',
							lastRetrieved: '2026-06-19',
						},
					}),
				},
			},
			dataCollection: null,
			privacyPolicy: 'https://rainbow.me/privacy',
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
			accountRecovery: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				// Rainbow supports cloud backup (iCloud/Google Drive) but not guardian-based recovery.
				guardianRecovery: supported({
					ref: {
						explanation:
							'Rainbow encrypts the seed phrase with a user-chosen password and stores the encrypted backup in iCloud (iOS) or Google Drive (Android).',
						url: 'https://rainbow.me/support/app/restore-from-a-backup',
					},
					minimumGuardianPolicy: {
						type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
						descriptionMarkdown:
							'Rainbow encrypts the seed phrase with the user wallet password and stores it in iCloud or Google Drive. Recovery requires the backup password and access to either cloud provider.',
						optionalGuardians: [
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'iCloud account',
								entity: apple,
							},
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Google Drive account',
								entity: alphabet,
							},
						],
						optionalGuardiansMinimumConfigurable: 1,
						optionalGuardiansMinimumNeededForRecovery: 1,
						requiredGuardians: [
							{
								type: GuardianType.WALLET_PASSWORD,
							},
						],
						secretReconstitution: 'CLIENT_SIDE',
					},
				}),
			},
			bugBountyProgram: notSupported,
			duressResistance: supported({
				basicUnlock: {
					ref: refTodo,
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: true,
						[BasicUnlockMechanism.BIOMETRIC]: false,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
			}),
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},

			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [],
			scamAlerts: null, // Rainbow uses Blockaid per questionnaire, but full details on all sub-fields pending follow-up
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								'The browser extension encrypts its keychain "vault" with a user-chosen password using `@metamask/browser-passworder` (PBKDF2, 600k iterations) before persisting it. The decrypted keychains live in memory only while unlocked.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/132521f80261f1c4473c33965ee27976d8506630/src/core/keychain/KeychainManager.ts',
						},
					],
					browserExtensionHardening: parseBrowserExtensionManifest(rainbowRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'The mobile app stores the seed phrase in `react-native-keychain`, gated by biometrics or device passcode (iOS `USER_PRESENCE`, Android `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`) wrapped by an RSA key held in OS keystore. The secret cannot be extracted by other software.',
							url: 'https://github.com/rainbow-me/rainbow/blob/8be7a792ef6258197a95ff275181cb2dc94e73da/src/features/local-auth/keychain.ts',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: parseMobileManifestJson(rainbowAndroidParsed, rainbowIosParsed),
					secureRng: SecureRngSource.OS_CSPRNG,
				},
			},
			transactionLegibility: {
				ref: refTodo,
				erc7730: supported({
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
				}),
				erc8213: supported({
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							transactionOutcome: TransactionOutcome.NOT_EXPLAINED,
						},
					[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: {
						nondeterminism: 'STATIC_SINGLE_OUTCOME' as const,
					},
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				// Source: Rainbow team responses via Walletbeat questionnaire
				builtInErc20Swap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.NONE,
					fullySponsored: false,
				}),
				erc20L1Transfer: null,
				ethL1Transfer: null,
				uniswapUSDCToEtherSwap: null,
			},
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'The browser extension CI runs `yarn install --immutable` and a dedicated `yarn check-lockfile` step, failing the build if yarn.lock is out of sync.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/e600feb293b94aa16f7bb54aef9fa58f00c1422e/.github/workflows/build.yml',
						},
						{
							explanation:
								'The mobile wallet Android release build installs dependencies with `yarn install --immutable`, which fails if yarn.lock would change.',
							url: 'https://github.com/rainbow-me/rainbow/blob/d79896d683cfa0ef8a8a6133057c4060acdbe63c/.github/workflows/android-play-store.yml',
						},
						{
							explanation:
								'The mobile wallet iOS release build installs dependencies with `yarn install --immutable`, which fails if yarn.lock would change.',
							url: 'https://github.com/rainbow-me/rainbow/blob/4782c0a9010ea5783761144fb46ef0b55f4cc572/.github/actions/ios-build/action.yaml',
						},
					],
				}),
				dependencyVulnerabilityScanning: supported({
					ref: [
						{
							explanation:
								'The browser extension runs `yarn audit:ci` (audit-ci) as a CI step, failing the build on vulnerable dependencies.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/e600feb293b94aa16f7bb54aef9fa58f00c1422e/.github/workflows/build.yml',
						},
						{
							explanation:
								'The mobile wallet runs `yarn audit-ci` as a CI step, failing the build on vulnerable dependencies.',
							url: 'https://github.com/rainbow-me/rainbow/blob/c203ae4e9cb48627310f37ebbab05dbb43211286/.github/workflows/unit-test.yml',
						},
					],
				}),
				hasPublicChangelog: {
					[Variant.BROWSER]: supported({
						ref: {
							explanation: 'Rainbow publishes browser extension release notes via GitHub Releases.',
							url: 'https://github.com/rainbow-me/browser-extension/releases',
						},
					}),
					[Variant.MOBILE]: supported({
						ref: {
							explanation: 'Rainbow publishes mobile wallet release notes via GitHub Releases.',
							url: 'https://github.com/rainbow-me/rainbow/releases',
						},
					}),
				},
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The browser extension build job checks out an external repository (`rainbow-me/browser-extension-env`) and re-runs `yarn setup` (which runs `yarn install` and `yarn ds:install`) during the build. This means build inputs are fetched from the network rather than from a pre-fetched, integrity-verified input set.',
							url: 'https://github.com/rainbow-me/browser-extension/blob/e600feb293b94aa16f7bb54aef9fa58f00c1422e/.github/workflows/build.yml',
						},
						{
							explanation:
								'The mobile wallet Android release build runs `yarn install --immutable && yarn setup` and resolves Gradle dependencies while assembling the release, fetching build inputs from the network.',
							url: 'https://github.com/rainbow-me/rainbow/blob/d79896d683cfa0ef8a8a6133057c4060acdbe63c/.github/workflows/android-play-store.yml',
						},
						{
							explanation:
								'The mobile wallet iOS build runs `yarn install --immutable && yarn setup` and `fastlane match`, which fetches signing certificates from a remote git repository during the build, fetching build inputs from the network.',
							url: 'https://github.com/rainbow-me/rainbow/blob/4782c0a9010ea5783761144fb46ef0b55f4cc572/.github/actions/ios-build/action.yaml',
						},
					],
				}),
				repositoryChangeControls: null,
				// Rainbow publishes no reproducible-build tooling, documentation, or
				// verification process, and its release builds are not hermetic (they fetch
				// inputs from the network during the build), so an independent party cannot
				// rebuild the released artifacts and confirm a bit-for-bit match.
				reproducibleBuilds: notSupported,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
