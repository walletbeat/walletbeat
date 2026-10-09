import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
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
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { mattmatt } from '../contributors/0xmattmatt'
import { minimalsm } from '../contributors/minimalsm'

export const bitget: SoftwareWallet = {
	metadata: {
		id: 'bitget',
		displayName: 'Bitget Wallet',
		tableName: 'Bitget',
		coinspectId: 'bitget',
		contributors: [mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://web3.bitget.com/en/docs'],
			extensions: [
				'https://chromewebstore.google.com/detail/bitget-wallet-crypto-web3/jiidiaalihmmhddjgbnbgdfflelocpak',
			],
			socials: {
				facebook: 'https://www.facebook.com/BitgetWallet/',
				linkedin: 'https://www.linkedin.com/company/bitgetwallet',
				x: 'https://x.com/BitgetWallet',
			},
			websites: ['https://web3.bitget.com/'],
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
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.AGGREGATED,
						byDefault: FeeDisplayLevel.AGGREGATED,
						fullySponsored: false,
						walletServiceFeeDisplayUnits: null,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo,
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
				globalAccountValue: featureSupported,
				perChainAccountValue: notSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
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
			ref: [
				{
					explanation:
						'BitKeep (now Bitget Wallet) raised a $15M Series A round in May 2022 with Dragonfly Capital as lead investor.',
					url: 'https://web3.bitget.com/en/blog/articles/6644',
				},
				{
					explanation:
						'Bitget invested a further $30M at a $300M valuation in March 2023, taking a controlling stake.',
					url: 'https://cointelegraph.com/news/multi-chain-wallet-bitkeep-raises-30m-at-300m-valuation',
				},
				{
					explanation:
						'BWB token tokenomics: 1.1% of the supply was allocated to a public offering and 10% to a private round.',
					url: 'https://web3.bitget.com/resource/BWB-tokenomics.html',
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
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://web3.bitget.com/resource/policy.html',
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
				drills: null,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation: "Bitget's bug bounty program is hosted through Bugrap.",
						url: 'https://bugrap.io/bounties/Bitget%20Wallet%20(Formerly%20BitKeep)',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2024-09-17' as const,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.BUGRAP,
				rewards: supported({
					currency: 'USD',
					maximum: 50000,
					minimum: 10,
				}),
				upgradePathAvailable: false,
			}),
			duressResistance: {
				[Variant.BROWSER]: null,
				[Variant.MOBILE]: {
					basicUnlock: {
						ref: [
							{
								explanation:
									'Users set a 6-digit passcode when creating a wallet and use it to sign transactions. The "Unlock required" option can be turned off, so neither the passcode nor biometrics is needed to open the app.',
								urls: [
									{
										label: 'Passcode',
										url: 'https://web3.bitget.com/helpCenter/484',
									},
									{
										label: 'Privacy policy, section 10',
										url: 'https://web3.bitget.com/resource/policy.html',
									},
								],
							},
						],
						mechanisms: {
							[BasicUnlockMechanism.PIN]: supported({
								type: BasicUnlockMechanismSupport.OPTIONAL,
							}),
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
				[Variant.BROWSER]: {
					ref: [
						{
							explanation:
								'The browser extension supports Ledger hardware wallets connected over USB, for EVM networks among others.',
							urls: [
								{
									label: 'Getting started with Ledger',
									url: 'https://web3.bitget.com/helpCenter/769',
								},
								{
									label: 'Connect your Ledger',
									url: 'https://web3.bitget.com/helpCenter/767',
								},
							],
						},
					],
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.USB],
						}),
					},
				},
				[Variant.MOBILE]: {
					ref: [
						{
							explanation: 'The app imports a Keystone 3 Pro by scanning its QR code.',
							urls: [
								{
									label: 'Keystone: Bitget Wallet (Mobile)',
									url: 'https://guide.keyst.one/docs/bitget',
								},
								{
									label: 'Bitget Wallet: Keystone import tutorial',
									url: 'https://web3.bitget.com/en/academy/bitget-wallet-adds-support-for-hardware-wallet-keystone-newbie-import-tutorial',
								},
							],
						},
					],
					wallets: {
						[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.QR],
						}),
					},
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Bitget Wallet Launches MPC Wallet, Providing a More Secure and User-Friendly Web3 Wallet Service',
						url: 'https://web3.bitget.com/en/blog/articles/bitget-wallet-launches-mpc-wallet',
					},
				],
				keyGeneration: KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
				multipartyKeyReconstruction:
					MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			// No public audit of the wallet app or extension code found; Bitget cites CertiK and SlowMist audits of its swap contracts only.
			// Source: https://web3.bitget.com/en/about/security-technology
			publicSecurityAudits: [],
			scamAlerts: {
				contractTransactionWarning: notSupported,
				scamUrlWarning: notSupported,
				sendTransactionWarning: notSupported,
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: supported({
					ref: [
						{
							explanation:
								'Bitget Wallet decodes a USDC approval as an authorization, showing the spender, and amount.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-23-bitget-erc7730-usdc-approval.png',
							label: 'Bitget Wallet authorization confirmation for a USDC approval',
						},
						{
							explanation:
								'Bitget Wallet does not decode an Aave supply; it shows a generic signature confirmation.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-23-bitget-erc7730-aave-supply.png',
							label: 'Bitget Wallet signature confirmation for an Aave supply',
						},
						{
							explanation:
								'Bitget Wallet does not decode the Aave supply nested within a Safe{Wallet} transaction.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-23-bitget-erc7730-safe-aave-supply.png',
							label: 'Bitget Wallet signature confirmation for a Safe{Wallet} Aave supply',
						},
						{
							explanation:
								'Bitget Wallet does not decode the inner calls of a Safe{Wallet} MultiSend batching a USDC approval and Aave supply.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-23-bitget-erc7730-safe-batch-approve-supply.png',
							label:
								'Bitget Wallet signature confirmation for a Safe{Wallet} batched approve and supply',
						},
						{
							explanation:
								'Bitget Wallet splits a batched USDC approval and Aave supply from an EOA into separate actions and decodes the approval, but does not decode the Aave supply properly.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-23-bitget-erc7730-batch-approve-supply.png',
							label: 'Bitget Wallet batch authorization for a batched approve and supply',
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
								'Bitget Wallet shows the EIP-712 message fields by default, but not the domain or type definitions.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-24-bitget-erc8213-eip712-message.png',
							label: 'Bitget Wallet signature confirmation for an EIP-712 message',
						},
						{
							explanation:
								'The full EIP-712 struct, including the domain and type definitions, is shown after opening "Meta data". No domain hash, message hash or EIP-712 digest is shown.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-24-bitget-erc8213-eip712-struct.png',
							label: 'Bitget Wallet meta data view of an EIP-712 struct',
						},
						{
							explanation:
								'Opening "Meta data" on a transaction shows the function signature, parameter types (without values) and the raw calldata hex with a copy button. No calldata digest is shown.',
							file: 'public/references/wallets/bitget/screenshots/2026-09-24-bitget-erc8213-calldata.png',
							label: 'Bitget Wallet meta data view of transaction calldata',
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
				transactionDetailsDisplay: null,
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: null,
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyLocking: null,
				dependencySandboxing: {
					// No LavaMoat or SES markers in the shipped v2.21.8 extension bundle.
					[Variant.BROWSER]: notSupported,
					[Variant.MOBILE]: null,
				},
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: notSupported,
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: {
						explanation:
							'The app is closed source. WalletScrutiny: "Build cannot be done because the source code is not publicly available."',
						url: 'https://walletscrutiny.com/android/com.bitkeep.wallet/',
					},
				}),
			},
		},
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
