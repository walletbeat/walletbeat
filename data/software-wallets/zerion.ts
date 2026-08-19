import { mattmatt } from '@/data/contributors/0xmattmatt'
import { lucemans } from '@/data/contributors/lucemans'
import { ren2140 } from '@/data/contributors/ren2140'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
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
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'

import zerionRawExtManifest from './manifests/zerion/klghhnkeealcohjjanjjdaeeggmfmlpl.manifest.json'
import {
	FeeDisplayLevel,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { nonEmptySet } from '@/types/utils/non-empty'

export const zerion: SoftwareWallet = {
	metadata: {
		id: 'zerion',
		displayName: 'Zerion',
		tableName: 'Zerion',
		contributors: [lucemans, mattmatt, ren2140],
		iconExtension: 'svg',
		lastUpdated: '2026-08-10',
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
						label: 'Zerion Dashboard, default swap view',
						file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-default-swap-view.png',
					},
					feesLargerThan1bps: {
						ref: {
							explanation:
								'Expanding "Details" shows the full fee breakdown, including the Zerion Fee expressed as a percentage (0.67%).',
							label: 'Zerion Dashboard, comprehensive swap view',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-comprehensive-swap-view.png',
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
					label: 'Zerion Dashboard',
					file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
				},
				ether: supported({
					ref: [
						{
							explanation:
								'The "All Networks" view sums the user’s ETH holdings across every network into a single item.',
							label: 'Zerion Dashboard, all networks',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
						},
						{
							explanation:
								'Filtering the dashboard to the Ethereum network shows the ETH balance held on that network specifically (0.0016 ETH / $3.00), isolated from other networks.',
							label: 'Zerion Dashboard, filtered to Ethereum',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-ethereum-network-view.png',
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
							label: 'Zerion Dashboard, all networks',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-dashboard.png',
						},
						{
							explanation:
								'Filtering the dashboard to the Ethereum network shows the USDC balance held on that network specifically (6.918 USDC / $6.92), isolated from other networks.',
							label: 'Zerion Dashboard, filtered to Ethereum',
							file: 'public/references/wallets/zerion/screenshots/2026-08-19-zerion-ethereum-network-view.png',
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
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: 'https://github.com/zeriontech/zerion-wallet-extension/blob/500e694184a101189a1de3a05cb0f516c42f567c/LICENSE',
				license: FOSSLicense.GPL_3_0,
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
			appIsolation: null,
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
				basicUnlock: {
					ref: refTodo,
					mechanisms: {
						[BasicUnlockMechanism.PIN]: true,
						[BasicUnlockMechanism.PASSWORD]: false,
						[BasicUnlockMechanism.BIOMETRIC]: true,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
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
				mobile: 'NOT_A_MOBILE_APP',
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
