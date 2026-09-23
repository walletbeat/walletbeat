import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
} from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { type SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import { BuiltInSwapDefaultApprovalBehavior } from '@/schema/features/self-sovereignty/permissions-management'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	FeeDisplayLevel,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

import { kudelskiSecurity } from '../entities/kudelski-security'
import { leastAuthority } from '../entities/least-authority'
import phantomRawExtManifest from './manifests/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa.manifest.json'

const securityAudits: SecurityAudit[] = [
	{
		ref: 'https://github.com/phantom/audit-reports/blob/3450f82bc6c633f5d2eceee9a979f98ac1ca3cb3/Kudelski-Security-2021.pdf',
		auditDate: '2021-05-07',
		auditor: kudelskiSecurity,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		ref: 'https://github.com/phantom/audit-reports/blob/3450f82bc6c633f5d2eceee9a979f98ac1ca3cb3/Least_Authority-2024.pdf',
		auditDate: '2024-06-07',
		auditor: leastAuthority,
		codeSnapshot: {
			commit: 'https://github.com/phantom/wallet/commit/aea4d38d3c4e9ebc7a02839c94e7b9fb381f1dbf',
			date: '2024-04-03' as const,
		},
		unpatchedFlaws: 'NONE_FOUND',
		variantsScope: 'ALL_VARIANTS',
	},
]

export const phantom: SoftwareWallet = {
	metadata: {
		id: 'phantom',
		displayName: 'Phantom',
		tableName: 'Phantom',
		coinspectId: 'phantom',
		contributors: [nconsigny, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-02-08',
		urls: {
			docs: ['https://docs.phantom.com/'],
			extensions: [
				'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
			],
			socials: {
				instagram: 'https://www.instagram.com/phantom/',
				linkedin: 'https://www.linkedin.com/company/phantomwallet/',
				reddit: 'https://www.reddit.com/r/Phantom/',
				x: 'https://x.com/phantom',
				youtube: 'https://www.youtube.com/@phantom-wallet',
			},
			websites: ['https://phantom.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
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
			ref: {
				explanation: 'Phantom uses username-based sending, which does not support ENS.',
				file: 'public/references/wallets/phantom/screenshots/2026-08-26-address-resolution-confirm-send-ens-name.png',
				label: 'Phantom Confirm Send screen with unresolved ENS name',
			},
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: {
						ref: [
							{
								explanation:
									'By default, Phantom aggregates swap fees into a single displayed amount.',
								file: 'public/references/wallets/phantom/screenshots/2026-08-26-swap-default-view.png',
								label: 'Phantom swap default fee view',
							},
							{
								explanation:
									'Hovering over the fee reveals a comprehensive breakdown of all fees for a single swap.',
								file: 'public/references/wallets/phantom/screenshots/2026-08-26-swap-hover.png',
								label: 'Phantom swap fee hover breakdown',
							},
						],
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
						'Phantom token dashboard shows a global account value and per-chain token balances across multiple chains, but no per-token cross-chain sum view.',
					file: 'public/references/wallets/phantom/screenshots/2026-08-26-token-dashboard.png',
					label: 'Phantom token dashboard',
				},
				ether: supported({
					ref: refTodo,
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: notSupported,
				usdc: supported({
					ref: refTodo,
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
			},
		},
		chainConfigurability: notSupported,
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
				ref: refNotNecessary,
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
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
			appIsolation: {
				[Variant.BROWSER]: {
					createInAppConnectionFlow: notSupported,
					erc7846WalletConnect: notSupported,
					ethAccounts: supported({
						ref: refTodo,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupported,
				},
				[Variant.MOBILE]: null,
				[Variant.DESKTOP]: null,
			},
			dataCollection: null,
			privacyPolicy: 'https://phantom.com/privacy',
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
				drills: notSupported,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Phantom operates an active bug bounty program through Cantina, covering client-side applications, web applications, platform infrastructure, and onchain assets.',
						url: 'https://cantina.xyz/bounties/5314819f-b0b2-4d39-b953-d02ec74cac1a?overviewTab=1&assetGroup=3',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2026-07-01',
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.CANTINA,
				rewards: supported({
					currency: 'USD',
					maximum: 100000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: {
				[Variant.BROWSER]: {
					basicUnlock: {
						ref: refTodo,
						mechanisms: {
							[BasicUnlockMechanism.PIN]: notSupported,
							[BasicUnlockMechanism.PASSWORD]: supported({
								type: BasicUnlockMechanismSupport.REQUIRED,
							}),
							[BasicUnlockMechanism.BIOMETRIC]: notSupported,
							[BasicUnlockMechanism.PATTERN]: notSupported,
						},
					},
					duressMode: notSupported,
				},
				[Variant.MOBILE]: {
					basicUnlock: {
						ref: refTodo,
						mechanisms: {
							[BasicUnlockMechanism.PIN]: notSupported,
							[BasicUnlockMechanism.PASSWORD]: notSupported,
							[BasicUnlockMechanism.BIOMETRIC]: supported({
								type: BasicUnlockMechanismSupport.OPTIONAL,
							}),
							[BasicUnlockMechanism.PATTERN]: notSupported,
						},
					},
					duressMode: notSupported,
				},
			},
			hardwareWalletSupport: {
				ref: {
					explanation: 'Phantom supports importing a Ledger hardware wallet via WebUSB.',
					file: 'public/references/wallets/phantom/screenshots/2026-08-26-ledger-import.png',
					label: 'Phantom Ledger import screen',
				},
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
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
			publicSecurityAudits: securityAudits,
			scamAlerts: null,
			securityBestPractices: {
				browser: {
					ref: refTodo,
					browserExtensionHardening: parseBrowserExtensionManifest(phantomRawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.NOT_VERIFIABLE,
					secureRng: SecureRngSource.NOT_VERIFIABLE,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'SOURCE_NOT_AVAILABLE',
			},
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: supported({
					ref: [
						{
							explanation:
								'Phantom decodes a USDC approval, showing the spender, and the amount it can transfer.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-23-phantom-erc7730-usdc-approval.png',
							label: 'Phantom transaction confirmation for a USDC approval',
						},
						{
							explanation:
								'Phantom does not decode an Aave supply; it only shows the simulated balance change.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-23-phantom-erc7730-aave-supply.png',
							label: 'Phantom transaction confirmation for an Aave supply',
						},
						{
							explanation:
								'Phantom does not decode the Aave supply nested within a Safe{Wallet} transaction.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-23-phantom-erc7730-safe-aave-supply.png',
							label: 'Phantom transaction confirmation for a Safe{Wallet} Aave supply',
						},
						{
							explanation:
								'Phantom does not decode the inner calls of a Safe{Wallet} MultiSend batching a USDC approval and Aave supply.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-23-phantom-erc7730-safe-batch-approve-supply.png',
							label:
								'Phantom transaction confirmation for a Safe{Wallet} batched approve and supply',
						},
					],
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
					ref: [
						{
							explanation:
								'Phantom shows the full EIP-712 struct, including the domain, message and type definitions, in an expandable "Message" section with a copy button. No domain hash, message hash or EIP-712 digest is shown.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-24-phantom-erc8213-eip712-struct.png',
							label: 'Phantom signature request for an EIP-712 message',
						},
						{
							explanation:
								'Phantom shows the raw calldata hex in an expandable "Data" section with a copy button. No formatted calldata or calldata digest is shown.',
							file: 'public/references/wallets/phantom/screenshots/2026-09-24-phantom-erc8213-calldata.png',
							label: 'Phantom transaction details with raw calldata',
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_OPTIONALLY,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_OPTIONALLY,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							'Phantom swap review screen for a 1 USDC to ETH swap. No approve step or approval amount is shown to the user before tapping "Swap Now".',
						file: 'public/references/wallets/phantom/screenshots/2026-09-09-phantom-swap-review.png',
						label: 'Phantom swap review screen for a 1 USDC to ETH swap',
						lastRetrieved: '2026-09-09',
					},
					{
						explanation:
							'The decoded input data of the Approve transaction generated by that swap shows unlimited approval, not the 1 USDC swap amount, and not disclosed anywhere in the swap review UI.',
						file: 'public/references/wallets/phantom/screenshots/2026-09-09-phantom-approve-unlimited-calldata.png',
						label: 'Decoded Approve transaction calldata showing an unlimited (max) approval value',
						lastRetrieved: '2026-09-09',
					},
				],
				approvalsManagement: notSupported,
				builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED,
			},
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					ref: {
						explanation:
							"Phantom's networks list shows no L2 support for Arbitrum or OP Stack chains.",
						file: 'public/references/wallets/phantom/screenshots/2026-08-26-networks-list.png',
						label: 'Phantom networks list',
					},
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
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
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
