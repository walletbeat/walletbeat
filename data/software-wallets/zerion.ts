import { mattmatt } from '@/data/contributors/0xmattmatt'
import { lucemans } from '@/data/contributors/lucemans'
import { ren2140 } from '@/data/contributors/ren2140'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import {
	ExposedAccountsBehavior,
	type ExposedAccountSet,
} from '@/schema/features/privacy/app-isolation'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
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
import type {
	ContractTransactionWarning,
	ScamUrlWarning,
	SendTransactionWarning,
} from '@/schema/features/security/scam-alerts'
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
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import {
	FeeDisplayLevel,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

import zerionRawExtManifest from './manifests/zerion/klghhnkeealcohjjanjjdaeeggmfmlpl.manifest.json'

export const zerion: SoftwareWallet = {
	metadata: {
		id: 'zerion',
		displayName: 'Zerion',
		tableName: 'Zerion',
		coinspectId: 'zerion',
		contributors: [lucemans, mattmatt, ren2140],
		iconExtension: 'svg',
		lastUpdated: '2026-08-31',
		urls: {
			docs: ['https://developers.zerion.io/'],
			extensions: [
				'https://chromewebstore.google.com/detail/zerion-wallet-crypto-defi/klghhnkeealcohjjanjjdaeeggmfmlpl',
			],
			repositories: ['https://github.com/zeriontech/zerion-wallet-extension'],
			socials: {
				farcaster: 'https://farcaster.xyz/zerion.eth',
				linkedin: 'https://www.linkedin.com/company/zeriontech/',
				x: 'https://x.com/zerion',
			},
			websites: ['https://zerion.io'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			// BIP support is not verified
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
				medium: 'OFFCHAIN',
				offchainDataVerifiability: 'NOT_VERIFIABLE',
				offchainProviderConnection: 'DIRECT_CONNECTION',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: {
						explanation:
							'The default swap view shows only the Network Fee, with a collapsed "Details" section for the rest of the fee breakdown.',
						file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-default-swap-view.png',
						label: 'Zerion Dashboard, default swap view',
					},
					feesLargerThan1bps: {
						ref: {
							explanation:
								'Expanding "Details" shows the full fee breakdown, including the Zerion Fee expressed as a percentage (0.67%).',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-comprehensive-swap-view.png',
							label: 'Zerion Dashboard, comprehensive swap view',
						},
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.AGGREGATED,
						fullySponsored: false,
						walletServiceFeeDisplayUnits: nonEmptySet(WalletServiceFeeDisplayUnit.PERCENTAGE),
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: {
					explanation:
						'The Zerion dashboard shows the total account value across all networks by default, and can be filtered down to a single network to see that network’s balance in isolation.',
					file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
					label: 'Zerion Dashboard',
				},
				ether: supported({
					ref: [
						{
							explanation:
								'The "All Networks" view sums the user’s ETH holdings across every network into a single item.',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
							label: 'Zerion Dashboard, all networks',
						},
						{
							explanation:
								'Filtering the dashboard to the Ethereum network shows the ETH balance held on that network specifically (0.0016 ETH / $3.00), isolated from other networks.',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-ethereum-network-view.png',
							label: 'Zerion Dashboard, filtered to Ethereum',
						},
					],
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: supported({
					ref: [
						{
							explanation:
								'The "All Networks" view sums the user’s USDC holdings across every network into a single item.',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
							label: 'Zerion Dashboard, all networks',
						},
						{
							explanation:
								'Filtering the dashboard to the Ethereum network shows the USDC balance held on that network specifically (6.918 USDC / $6.92), isolated from other networks.',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-ethereum-network-view.png',
							label: 'Zerion Dashboard, filtered to Ethereum',
						},
					],
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
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
					erc20BalanceLookup: notSupported,
					erc20TokenSend: notSupported,
					etherBalanceLookup: notSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			}),
		}),
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				ref: [
					{
						explanation: 'Zerion supports EIP-1193 and EIP-2700.',
						url: [
							{
								label: 'Provider class in the extension source code',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/da2f64331b2f82275f63aec00f2a6e970f084098/src/modules/ethereum/provider.ts#L53-L185',
							},
							{
								label: 'Provider assignment in the extension source code',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/da2f64331b2f82275f63aec00f2a6e970f084098/src/content-script/in-page.ts#L115-L145',
							},
						],
					},
					{
						explanation: 'Zerion supports EIP-6963.',
						label: 'EIP-6963 provider announcement in the extension source code',
						url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/da2f64331b2f82275f63aec00f2a6e970f084098/src/content-script/eip6963.ts#L23-L47',
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				[Variant.BROWSER]: {
					ref: {
						explanation:
							"The browser extension's core and app code are open source under the GPL-3.0 license.",
						label: 'Zerion extension LICENSE',
						url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/500e694184a101189a1de3a05cb0f516c42f567c/LICENSE',
					},
					license: FOSSLicense.GPL_3_0,
				},
				[Variant.MOBILE]: {
					ref: {
						explanation:
							'Zerion publishes the wallet core used by its iOS and Android apps, containing the key container, signer, and key storage, under the Apache-2.0 license.',
						url: [
							{
								label: 'Zerion Wallet Core for iOS',
								url: 'https://github.com/zeriontech/wallet-core-ios/blob/f841ea553163b5682730b035b0938aef48aeaacc/LICENSE',
							},
							{
								label: 'Zerion Wallet Core for Android',
								url: 'https://github.com/zeriontech/wallet-core-android/blob/644f50534bfa5fa8a133a260b3fca42546bdcd2b/LICENSE',
							},
						],
					},
					license: FOSSLicense.APACHE_2_0,
				},
			},
			walletAppLicense: {
				[Variant.BROWSER]: {
					ref: {
						explanation:
							"The browser extension's core and app code are open source under the GPL-3.0 license.",
						label: 'Zerion extension LICENSE',
						url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/500e694184a101189a1de3a05cb0f516c42f567c/LICENSE',
					},
					license: FOSSLicense.GPL_3_0,
				},
				[Variant.MOBILE]: {
					ref: {
						explanation:
							'While Zerion states that the core code of its iOS and Android apps is open for review, the broader mobile application code is not.',
						label: 'Zerion security page, "Open source"',
						lastRetrieved: '2026-08-30',
						url: 'https://zerion.io/security',
					},
					license: SourceNotAvailableLicense.PROPRIETARY,
				},
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Zerion announced a $2M seed round led by Placeholder in December 2019.',
					label: 'Zerion raises $2M to fuel next phase of DeFi',
					url: 'https://zerion.io/blog/zerion-raises-2m-to-fuel-next-phase-of-defi/',
				},
				{
					explanation: 'Zerion announced an $8.2M Series A led by Mosaic Ventures in July 2021.',
					label: 'Zerion raises $8.2M from Mosaic Ventures',
					url: 'https://zerion.io/blog/zerion-raises-8-2m-from-mosaic-ventures-to-take-defi-mainstream/',
				},
				{
					explanation:
						'Zerion announced a $12.3M Series B led by Wintermute Ventures in October 2022.',
					label: 'Zerion closes $12M Series B',
					url: 'https://www.prnewswire.com/news-releases/zerion-closes-12m-series-b-fundraise-led-by-wintermute-ventures-301646731.html',
				},
				{
					explanation:
						'Zerion charges a 0.67% service fee on swaps and bridges. Premium subscribers pay 0.25% and Gold DNA holders are exempt.',
					label: 'Understanding fees on Zerion',
					url: 'https://help.zerion.io/en/articles/4813752-understanding-fees-on-zerion',
				},
				{
					explanation:
						'In the browser extension, the swap quote shows the service fee as a labeled "Zerion Fee" row, with a tooltip and a link explaining it.',
					label: 'Swap quote fee row',
					url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/ui/pages/SwapForm2/QuoteDetails/QuoteDetails.tsx#L68-L110',
				},
				{
					explanation:
						'In the mobile app, the swap screen states the fee rate underneath the quote without requiring any interaction.',
					file: 'public/references/wallets/zerion/screenshots/2026-08-12-zerion-swap-fee-disclosure.png',
					label: 'Mobile swap screen showing the service fee',
				},
				{
					explanation:
						'For perpetuals, the fee rate shown to the user separates the fee taken by Zerion from the fee taken by the Hyperliquid venue.',
					label: 'Perpetuals fee breakdown',
					url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/modules/hyperliquid/fees/calculateFeeRate.ts#L28-L46',
				},
				{
					explanation:
						'The mobile perpetuals fee breakdown lists the Zerion fee and the provider fee as separate line items.',
					file: 'public/references/wallets/zerion/screenshots/2026-08-12-zerion-perps-fee-breakdown.png',
					label: 'Mobile perpetuals fee breakdown',
				},
				{
					explanation:
						'Zerion DNA is a membership NFT granting fee discounts and Premium access. It carries no governance rights, and Zerion has no governance token.',
					label: 'The next evolution of Zerion Genesis',
					url: 'https://zerion.io/blog/genesis-meets-dna/',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false, // No donation mechanism in the app or on the website; funding is equity and fee revenue
				ecosystemGrants: false, // Zerion's three funding announcements enumerate its sources; no ecosystem or foundation grant is listed
				governanceTokenLowFloat: false, // No governance token: DNA is a membership NFT, and the ZERO Network L2 has no token
				governanceTokenMostlyDistributed: false, // No governance token
				hiddenConvenienceFees: false, // The swap and bridge fee is documented and shown in-app, and the perpetuals fee separates Zerion's share from the venue's
				publicOffering: false, // No token sale or public equity offering; every round was private
				selfFunded: false, // Venture-backed from the 2019 seed round onward
				transparentConvenienceFees: true, // 0.67% service fee on swaps and bridges, documented publicly and shown in the swap quote details panel
				ventureCapital: true, // $22.5M across seed, Series A and Series B
			},
		},
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: {
				[Variant.BROWSER]: {
					createInAppConnectionFlow: notSupportedWithRef({
						ref: {
							explanation:
								'The connection dialog lists the accounts that already exist, and offers no way to create a new one.',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-browser-connect-wallet-picker.png',
							label: 'Zerion browser extension connection dialog with the account list expanded',
							lastRetrieved: '2026-08-19',
						},
					}),
					erc7846WalletConnect: notSupportedWithRef({
						ref: [
							{
								explanation:
									"`wallet_connect` is not defined in Zerion's wallet and app integration connector code.",
								label: 'Zerion browser extension source code',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/background/messaging/port-message-handlers/createWalletMessageHandler.ts#L25-L38',
							},
						],
					}),
					ethAccounts: supported<WithRef<ExposedAccountSet>>({
						ref: [
							{
								explanation:
									'A site is given the one account currently selected in the wallet, and only if the user has connected that account to that site. Otherwise, it is given nothing.',
								label: '`eth_accounts` in the extension source code',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/background/Wallet/Wallet.ts#L2232-L2242',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupportedWithRef({
						ref: [
							{
								explanation:
									'The connection dialog offers whichever account is currently selected in the wallet, not the account the site was connected with before.',
								label: 'Connection dialog default selection',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/ui/pages/RequestAccounts/RequestAccounts.tsx#L414-L428',
							},
							{
								explanation:
									'Connecting to a site changes which account is selected in the wallet, so the change carries over to every other site.',
								label: 'Connection approval in the extension source code',
								url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/background/Wallet/Wallet.ts#L2498-L2504',
							},
						],
					}),
				},
				[Variant.MOBILE]: {
					createInAppConnectionFlow: notSupportedWithRef({
						ref: [
							{
								explanation:
									'The connection sheet shows one "Wallet" field, with Cancel and Connect.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-connect-sheet.png',
								label: 'Zerion mobile app connection sheet',
								lastRetrieved: '2026-08-19',
							},
							{
								explanation:
									'Opening the wallet field lists the accounts that already exist. Each one offers only "Copy address", and there is no way to create a new account.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-account-picker.png',
								label: 'Zerion mobile connection sheet with the account list expanded',
								lastRetrieved: '2026-08-19',
							},
						],
					}),
					erc7846WalletConnect: notSupportedWithRef({
						ref: {
							explanation:
								'Calling `wallet_connect` from the Walletbeat test page in the Zerion in-app browser returns "the method wallet_connect does not exist/is not available".',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-wallet-connect-unsupported.png',
							label: 'Walletbeat test page in the Zerion in-app browser',
							lastRetrieved: '2026-08-19',
						},
					}),
					ethAccounts: supported<WithRef<ExposedAccountSet>>({
						ref: [
							{
								explanation: 'Before connecting, the site is given no accounts.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-eth-accounts-empty.png',
								label: 'Walletbeat test page before connecting',
								lastRetrieved: '2026-08-19',
							},
							{
								explanation: 'After connecting, the site is given one account.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-eth-accounts-single.png',
								label: 'Walletbeat test page after connecting',
								lastRetrieved: '2026-08-19',
							},
							{
								explanation:
									'Selecting a different account in the wallet hands that account to a site that is already connected, without asking the user again.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-eth-accounts-after-account-switch.png',
								label: 'Walletbeat test page after switching the selected account',
								lastRetrieved: '2026-08-19',
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupportedWithRef({
						ref: [
							{
								explanation: 'A second account is connected to app.uniswap.org.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-uniswap-connected-second-account.png',
								label: 'Zerion mobile showing the second account connected to app.uniswap.org',
								lastRetrieved: '2026-08-19',
							},
							{
								explanation:
									'After disconnecting and connecting again, the sheet offers the first account instead of the one the site was connected with.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-app-isolation-uniswap-reconnect-default.png',
								label:
									'Zerion mobile connection sheet for app.uniswap.org offering the first account',
								lastRetrieved: '2026-08-19',
							},
						],
					}),
				},
			},
			dataCollection: null,
			privacyPolicy: null,
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
				drills: notSupportedWithRef({
					ref: [
						{
							explanation:
								'Zerion only warns about backing up the recovery phrase if it has never been backed up (`lastBackedUp == null`). Once the backup is confirmed `lastBackedUp` is set and never reset, so the reminder never reappears.',
							url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/ui/components/BackupInfoNote/BackupInfoNote.tsx#L12-L18',
						},
					],
				}),
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation: 'Since March 2022, Zerion has a live bug bounty program.',
						url: 'https://immunefi.com/bug-bounty/zerion',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-12-17' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.IMMUNEFI,
				rewards: supported({
					currency: 'USD',
					maximum: 25000,
					minimum: 1000,
				}),
				upgradePathAvailable: false,
			}),
			duressResistance: {
				[Variant.BROWSER]: null,
				[Variant.MOBILE]: {
					basicUnlock: {
						ref: [
							{
								explanation: 'The app unlocks with a PIN or with fingerprint or face unlock.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-31-zerion-android-security-settings.png',
								label: 'Security settings on Android',
							},
							{
								explanation: 'The app unlocks with a PIN or with fingerprint or face unlock.',
								file: 'public/references/wallets/zerion/screenshots/2026-08-31-zerion-ios-security-settings.png',
								label: 'Security settings on iOS',
							},
						],
						mechanisms: {
							[BasicUnlockMechanism.PIN]: true,
							[BasicUnlockMechanism.PASSWORD]: false,
							[BasicUnlockMechanism.BIOMETRIC]: true,
							[BasicUnlockMechanism.PATTERN]: false,
						},
					},
					duressMode: notSupported,
				},
			},
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'Ledger has direct support in Zerion. Other hardware wallets (Trezor, Keystone, GridPlus, etc.) work via WalletConnect or external apps—with an extra hop.',
						url: ['https://www.ledger.com/zerion'],
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
				},
			},
			keysHandling: {
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [],
			scamAlerts: {
				contractTransactionWarning: supported<WithRef<ContractTransactionWarning>>({
					ref: [
						{
							explanation:
								'Zerion sends the transaction to their server, which simulates it and returns whether the contract address is a known app.',
							url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/modules/zerion-api/requests/wallet-simulate-transaction.ts#L46-L63',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: false,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation: 'Zerion sends the URL domain to their server for security checks.',
							url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/482c0a5f57cee79b618147c804a92a98240c559a/src/modules/zerion-api/requests/security-check-url.ts#L19-L28',
						},
					],
					leaksUserAddress: true,
					leaksUserIp: true,
					leaksVisitedUrl: 'DOMAIN_ONLY',
				}),
				sendTransactionWarning: supported<SendTransactionWarning>({
					ref: [
						{
							file: 'public/references/wallets/zerion/screenshots/2026-07-24-zerion-address-book.png',
							label: 'Zerion flags a recipient address as already in the address book when sending',
						},
					],
					addressPoisoningDetection: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					userWhitelist: true,
				}),
				unlimitedApprovalWarning: notSupported,
			},
			securityBestPractices: {
				browser: {
					ref: refTodo,
					browserExtensionHardening: parseBrowserExtensionManifest(zerionRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'SOURCE_NOT_AVAILABLE',
			},
			transactionLegibility: {
				ref: refTodo,
				erc4361: notSupportedWithRef({
					ref: {
						explanation: 'Zerion does not format SIWE requests for easy readability.',
						file: 'public/references/wallets/zerion/screenshots/2026-07-24-zerion-erc4361-siwe.png',
						label: 'Zerion sign-in dialog for an ERC-4361 signature request',
					},
				}),
				erc7730: supported({
					ref: refTodo,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
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
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				erc8213: supported({
					ref: refTodo,
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
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ETH_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
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
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
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
					ref: refTodo,
					arbitrum: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					opStack: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'A committed `package-lock.json` pins every dependency to an exact resolved version with an integrity hash.',
							url: 'https://github.com/zeriontech/zerion-wallet-extension/blob/76c2f4384d345fe6790121055b1afb603a02d1ae/package-lock.json',
						},
					],
				}),
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: supported({
					ref: 'https://github.com/zeriontech/zerion-wallet-extension/releases',
				}),
				hermeticBuilds: notSupported,
				repositoryChangeControls: {
					ref: [
						{
							explanation:
								'The default-branch ruleset blocks deletion and non-fast-forward pushes.',
							label: 'main protection',
							url: 'https://github.com/zeriontech/zerion-wallet-extension/rules/12153885',
						},
						{
							explanation:
								'Pull requests require zero approvals, and no status checks are configured.',
							label: 'Ruleset definition',
							url: 'https://api.github.com/repos/zeriontech/zerion-wallet-extension/rulesets/12153885',
						},
						{
							explanation: 'The repository has one ruleset and it targets branches, not tags.',
							label: 'Repository ruleset list',
							url: 'https://api.github.com/repos/zeriontech/zerion-wallet-extension/rulesets',
						},
					],
					branchDeletionBlocked: true,
					forcePushBlocked: true,
					requiredChecks: false,
					requiredReview: false,
					tagsImmutable: false,
				},
				reproducibleBuilds: null,
			},
		},
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
