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
		ref: {
			label: 'SlowMist audit report v1.1.0',
			url: 'https://github.com/Elytro-eth/elytro-wallet-core/blob/68ae7ff6a21143325bcf3f73217b6e95b4ae9deb/audits/SlowMist%20Audit%20Report%20v1.1.0.pdf#binary-file',
		},
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
		ref: {
			label: 'SlowMist audit report v1.0.0',
			url: 'https://github.com/Elytro-eth/elytro-wallet-core/blob/68ae7ff6a21143325bcf3f73217b6e95b4ae9deb/audits/SlowMist%20Audit%20Report%20v1.0.0.pdf#binary-file',
		},
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
		lastUpdated: '2026-10-18',
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
				ref: {
					explanation: 'The Elytro extension code is licensed under GPL-3.0.',
					label: 'Elytro license',
					url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/LICENSE#L1-L2',
				},
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: {
				explanation:
					'Elytro, formerly Soul Wallet, raised a $3 million seed round from venture investors in 2023.',
				label: 'TechCrunch on the Soul Wallet seed round',
				url: 'https://techcrunch.com/2023/03/16/soul-wallet-crypto-wallet/',
			},
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
						"Elytro's terms say it has no bug bounty and pays no reward for reported bugs unless it agrees to in writing.",
					label: 'Elytro Terms of Use, section 3.4',
					url: 'https://elytro.notion.site/elytro-terms-of-use',
				},
			}),
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: {
				[Variant.BROWSER]: {
					ref: [
						{
							explanation:
								"The extension creates the account's signing key on the user's device and stores it encrypted with the user's passcode.",
							urls: [
								{
									label: 'Key generation',
									url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/background/services/keyring.ts#L62-L83',
								},
								{
									label: 'Vault encryption',
									url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/utils/passworder.ts#L25-L52',
								},
							],
						},
					],
					keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
					multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
				},
				[Variant.MOBILE]: null,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: supported({
				ref: [
					{
						explanation:
							'Elytro implements P256 verification using OpenZeppelin P256 verifier in their WebAuthn library.',
						url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/9c6d5d9a8c3aa58a92b02ddb901478cd429569c7/contracts/libraries/WebAuthn.sol#not-line-specific',
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
				artifactSigning: { [Variant.BROWSER]: notSupported, [Variant.MOBILE]: null },
				dependencyAgeGate: null,
				dependencyLocking: {
					[Variant.BROWSER]: notSupportedWithRef({
						ref: {
							explanation:
								"The extension's build instructions don't enforce locked dependency versions.",
							label: 'Build instructions',
							url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/README.md#L69-L73',
						},
					}),
					[Variant.MOBILE]: null,
				},
				dependencySandboxing: {
					[Variant.BROWSER]: notSupportedWithRef({
						ref: {
							explanation:
								"The extension locks down JavaScript's built-in objects, but it doesn't isolate its dependencies from each other.",
							label: 'Security setup code',
							url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/src/utils/security.ts#L19-L43',
						},
					}),
					[Variant.MOBILE]: null,
				},
				dependencyVulnerabilityScanning: {
					[Variant.BROWSER]: notSupported,
					[Variant.MOBILE]: null,
				},
				hasPublicChangelog: { [Variant.BROWSER]: notSupported, [Variant.MOBILE]: null },
				hermeticBuilds: { [Variant.BROWSER]: notSupported, [Variant.MOBILE]: null },
				repositoryChangeControls: null,
				reproducibleBuilds: {
					[Variant.BROWSER]: notSupportedWithRef({
						ref: {
							explanation:
								'Building the extension needs private API keys, and each release build raises the version number automatically.',
							urls: [
								{
									label: 'Required API keys',
									url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/CONFIGURATION.md#L19-L39',
								},
								{
									label: 'Version bump on build',
									url: 'https://github.com/Elytro-eth/Elytro/blob/3ac7582f1198810b84f313896baa710241c2b7d2/apps/extension/package.json#L11-L15',
								},
							],
						},
					}),
					[Variant.MOBILE]: null,
				},
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
