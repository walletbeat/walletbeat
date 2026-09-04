import { h3rman } from '@/data/contributors/0xh3rman'
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
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { UnlimitedApprovalWarning } from '@/schema/features/security/scam-alerts'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import type { ChainConfigurability } from '@/schema/features/self-sovereignty/chain-configurability'
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
import { type References, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { parseMobileManifestJson } from '@/tools/manifest-collector/mobile-manifest-parser'
import type { Nullable } from '@/types/utils/nullable'

import { certik } from '../entities/certik'
import gemwalletAndroidParsed from './manifests/gemwallet/android.parsed.json'
import gemwalletIosParsed from './manifests/gemwallet/ios.parsed.json'

const securityAudits: SecurityAudit[] = [
	{
		ref: {
			explanation:
				'CertiK performed a security audit of Gem Wallet covering key management, transaction signing, seed handling, and address derivation. The report lists 0 critical and 0 major findings, 6 medium-severity findings, and 5 minor findings, all resolved.',
			label: 'Gem Wallet CertiK Security Audit (April 2026)',
			url: 'https://static.gemwallet.com/audits/Gem-Wallet-CertiK-Security-Audit-April-2026.pdf',
		},
		auditDate: '2026-04-08',
		auditor: certik,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: 'ALL_VARIANTS',
	},
]

const bugBountyRefs: References = [
	{
		explanation:
			'Gem Wallet launched a self-hosted bug bounty program on November 12, 2025, covering the iOS and Android apps, open-source repositories, and backend infrastructure, with rewards from $100 to $8,000 based on severity.',
		label: 'Gem Wallet Launches Bug Bounty Program',
		url: 'https://gemwallet.com/learn/gem-wallet-launches-bug-bounty-program/',
	},
	{
		explanation:
			'As of June 2, 2026, Gem Wallet no longer operates a standing monetary bug bounty program; private/responsible vulnerability disclosure remains open for good-faith, reproducible reports, with in-scope targets being the latest iOS/Android apps, the Gem Wallet monorepo, and gemwallet.com/api.gemwallet.com/gemnodes.com. No Safe Harbor or other explicit legal-protection language is provided, only a requirement that testing be conducted in good faith.',
		label: 'Gem Wallet no longer runs a standing bug bounty program',
		lastRetrieved: '2026-09-03',
		url: 'https://gemwallet.com/security/bug-bounty/',
	},
]

export const gemwallet: SoftwareWallet = {
	metadata: {
		id: 'gemwallet',
		displayName: 'Gem Wallet',
		tableName: 'Gem Wallet',
		coinspectId: 'gem',
		contributors: [h3rman],
		iconExtension: 'svg',
		lastUpdated: '2025-10-14',
		urls: {
			androidManifestXml:
				'https://raw.githubusercontent.com/gemwalletcom/wallet/main/android/app/src/raw/AndroidManifest.xml',
			docs: ['https://docs.gemwallet.com/'],
			iosInfoPlist:
				'https://raw.githubusercontent.com/gemwalletcom/wallet/main/ios/Gem/Resources/Info.plist',
			repositories: ['https://github.com/gemwalletcom/wallet'],
			socials: {
				discord: 'https://discord.com/invite/4jpxtwT8r6',
				instagram: 'https://www.instagram.com/GemWalletApp/',
				reddit: 'https://www.reddit.com/r/gemwallet_official/',
				telegram: 'https://t.me/gemwallet',
				x: 'https://x.com/gemwallet',
				youtube: 'https://www.youtube.com/@gemwallet',
			},
			websites: ['https://gemwallet.com'],
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
			ref: [
				{
					explanation:
						'Gem Wallet supports sending to ENS addresses, but users need to verify which chain they are using.',
					url: 'https://gemwallet.com',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Gem Wallet is licensed under the GPL-3.0 license.',
						url: 'https://github.com/gemwalletcom/gem-ios/blob/ef264f54eacacacba837735ac6ed605c9512f84a/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Gem Wallet publishes transparent revenue data on Dune Analytics, showing all revenue sources and breakdowns.',
					url: 'https://dune.com/gemwallet/gem-wallet',
				},
			],
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: true,
				ventureCapital: false,
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
			privacyPolicy: 'https://gemwallet.com/privacy',
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
			bugBountyProgram: null,
			duressResistance: {
				basicUnlock: {
					mechanisms: {
						[BasicUnlockMechanism.PIN]: false,
						[BasicUnlockMechanism.PASSWORD]: false,
						[BasicUnlockMechanism.BIOMETRIC]: true,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
			},
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: securityAudits,
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet uses GoPlus and HashDit for security detection, providing malicious contract detection and transaction analysis.',
							url: 'https://gemwallet.com',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: false,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet warns users about outgoing transactions to unknown addresses.',
							url: 'https://gemwallet.com',
						},
					],
					addressPoisoningDetection: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: [
						{
							explanation:
								'Every chain client (including the EVM broadcast path) is built from a single per-chain endpoint URL supplied by the platform-side `AlienProvider.get_endpoint(chain)`, the same endpoint Gem Wallet lets users override with a fully custom RPC node from Settings > Network. There is no separate relay/bundler path for transaction broadcast: `eth_sendRawTransaction` goes out over that same client.',
							url: 
								{
									label: 'EVM transaction broadcast goes through that same client',
									url: 'https://github.com/gemwalletcom/wallet/blob/61971f542acbe85caabea6363fb84e4a612cf701/core/crates/gem_evm/src/provider/transaction_broadcast.rs#L20-L26',
								},
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: null,
				}),
				erc20L1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: [],
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
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
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
