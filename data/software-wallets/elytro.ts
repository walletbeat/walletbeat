import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { slowMist } from '@/data/entities/slowmist'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const elytroAudits: SecurityAudit[] = [
	{
		ref: 'https://github.com/Elytro-eth/elytro-wallet-core/blob/68ae7ff6a21143325bcf3f73217b6e95b4ae9deb/audits/SlowMist%20Audit%20Report%20v1.1.0.pdf',
		auditDate: '2025-07-07',
		auditor: slowMist,
		codeSnapshot: {
			commit:
				'https://github.com/Elytro-eth/elytro-wallet-core/commit/26d30a431b42c5f8241db58c6390443896a37077',
			date: '2025-05-24',
		},
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: 'ALL_VARIANTS',
	},
	{
		ref: 'https://github.com/Elytro-eth/elytro-wallet-core/blob/68ae7ff6a21143325bcf3f73217b6e95b4ae9deb/audits/SlowMist%20Audit%20Report%20v1.0.0.pdf',
		auditDate: '2024-05-16',
		auditor: slowMist,
		codeSnapshot: {
			commit:
				'https://github.com/Elytro-eth/soul-wallet-contract/commit/fd9d0ce5572826ebf9e6842b5316977e17316ac2',
			date: '2024-05-16',
			tag: 'preliminary_audit',
		},
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: 'ALL_VARIANTS',
	},
]

export const elytro: SoftwareWallet = {
	metadata: {
		id: 'elytro',
		displayName: 'Elytro',
		tableName: 'Elytro',
		coinspectId: 'elytro',
		contributors: [nconsigny, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			repositories: ['https://github.com/Elytro-eth'],
			socials: {
				telegram: 'https://t.me/+l9coqJq9QHgyYjI1',
				x: 'https://x.com/Elytro_eth',
			},
			websites: ['https://elytro.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: {
					explanation: 'Elytro supports ERC-4337 smart contract wallets',
					url: 'https://github.com/Elytro-eth/soul-wallet-contract',
				},
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
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
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': null,
				'2700': null,
				'6963': null,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'The Elytro extension monorepo is licensed under GPL-3.0.',
						url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/LICENSE',
					},
					{
						explanation:
							'The extension depends on `@elytro/sdk` and other packages fetched from npm whose source repository (`Elytro-eth/elytro-wallet-lib`) is not public.',
						url: 'https://registry.npmjs.org/@elytro/sdk',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Soul Wallet (renamed Elytro) raised a $3M seed round in 2023 from investors including Struck Crypto, Game7, NGC Ventures, Alchemy and Signum Capital.',
					url: 'https://techcrunch.com/2023/03/16/soul-wallet-crypto-wallet/',
				},
				{
					explanation:
						'The extension has no built-in swap or bridge; it links out to external apps, and Elytro says users pay only network fees.',
					url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/constants/dapps.ts',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: false,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: false,
				ventureCapital: true,
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
			accountRecovery: null,
			bugBountyProgram: notSupportedWithRef({
				ref: {
					explanation:
						'The only program was the 2024 Soul Wallet contract bounty in an archived repository; Elytro\'s terms say "No bug‑bounty commitment … no bounty or reward is due unless we expressly agree in writing."',
					url: 'https://github.com/Elytro-eth/soul-wallet-contract/blob/fc7cc084563ad1bda870df841b77caa9ee3a3661/bug-bounty.md',
				},
			}),
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The extension generates the owner key locally with viem `generatePrivateKey` (browser CSPRNG) and stores it encrypted with AES-GCM under a PBKDF2-derived passcode key.',
						url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/background/services/keyring.ts',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: supported({
				ref: [
					{
						explanation:
							'Elytro implements P256 verification using OpenZeppelin P256 verifier in their WebAuthn library.',
						url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/9c6d5d9a8c3aa58a92b02ddb901478cd429569c7/contracts/libraries/WebAuthn.sol',
					},
				],
				details: 'Elytro uses FreshCryptoLib for passkey verification in their WebAuthn library.',
				library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
				libraryUrl:
					'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/d183d9b07a6cb0772ff52aa4e3e40165e99d6359/contracts/utils/cryptography/P256.sol',
			}),
			publicSecurityAudits: elytroAudits,
			scamAlerts: null,
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
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: notSupported,
				dependencyAgeGate: null,
				dependencyLocking: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The repository has no CI workflows; lockfiles are committed but builds are not run with a frozen lockfile in CI.',
							url: 'https://github.com/Elytro-eth/Elytro',
						},
					],
				}),
				dependencySandboxing: notSupportedWithRef({
					ref: {
						explanation:
							'Hardened JavaScript (`lockdown()` from the `ses` package) protects JavaScript built-in objects, but there are no LavaMoat policies or per-package compartments.',
						url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/utils/security.ts',
					},
				}),
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: notSupported,
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupportedWithRef({
					ref: {
						explanation:
							'Builds need private API keys and bump the version automatically; no reproducible build process is documented.',
						url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/CONFIGURATION.md',
					},
				}),
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
