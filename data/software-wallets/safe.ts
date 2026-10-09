import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { ackee } from '@/data/entities/ackee'
import { certora } from '@/data/entities/certora'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { type ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import {
	CallDataDisplay,
	DataDisplayOptions,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
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
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display' // for level
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license' // assuming path
import { type ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			docs: ['https://docs.safe.global/'],
			repositories: [
				'https://github.com/safe-global/safe-wallet-monorepo',
				'https://github.com/safe-fndn',
			],
			websites: ['https://safe.global'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: refTodo,
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: refNotNecessary,
				canDeployNew: true,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				supportedOwners: 'ANY_NUMBER_OF_SIGNERS',
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
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
		chainConfigurability: supported({
			ref: refTodo,
			customChainRpcEndpoint: notSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: featureSupported,
					erc20TokenSend: featureSupported,
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST,
			}),
		}),
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
						explanation:
							'The Safe{Wallet} monorepo (web and mobile apps) is licensed under GPL-3.0.',
						label: 'Safe License File',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'SafeDAO has received ecosystem grants; example Optimism grant proposal in the Optimism governance forum.',
					url: 'https://gov.optimism.io/t/draft-gf-phase-1-proposal-old-template-safe/3400',
				},
				{
					explanation:
						'Safe community updates covering grants and RPGF-related support across ecosystems.',
					url: 'https://forum.safe.global/t/safedao-community-updates/4213',
				},
				{
					explanation:
						'Community‑Aligned Fees: revenue (e.g., Native Swaps) pledged to SafeDAO; fee approach is explained publicly.',
					url: 'https://safefoundation.org/blog/safedao-community-aligned-fees-introduction',
				},
				{
					explanation:
						'The Safe Ecosystem Foundation raised a $100M strategic round led by 1kx in 2022, with Tiger Global, Blockchain Capital and others.',
					url: 'https://safefoundation.org/blog/gnosis-safe-raises-usd100-million-led-by-1kx-to-unlock-digital-asset',
				},
				{
					explanation:
						'SAFE tokenomics and governance scope; currently primarily used for SafeDAO treasury resource allocation (e.g., grants).',
					url: 'https://safefoundation.org/blog/safe-tokenomics',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true,
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
			privacyPolicy: 'https://safe.global/privacy',
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
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
					}),
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: supported({
				ref: [
					{
						url: 'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
					},
					{
						explanation: 'Safe uses FCL P256 verifier for passkey verification.',
						url: 'https://github.com/safe-fndn/safe-modules/blob/1e57772571fc72471b7bc3203fde9b1799fb87d4/modules/passkey/contracts/verifiers/FCLP256Verifier.sol',
					},
				],
				details: 'Safe uses FreshCryptoLib for passkey verification in their 4337 modules.',
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl:
					'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
			}),
			publicSecurityAudits: [
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Certora.pdf',
					auditDate: '2025-01-14',
					auditor: certora,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Ackee.pdf',
					auditDate: '2025-05-28',
					auditor: ackee,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: refTodo,
					contractRegistry: true, //blockaid
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true, //blockaid
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: refTodo,
					leaksUserAddress: true,
					leaksUserIp: true,
					leaksVisitedUrl: 'FULL_URL',
				}),
				sendTransactionWarning: supported({
					ref: refTodo,
					addressPoisoningDetection: false,
					leaksRecipient: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					newRecipientWarning: true, //blockaid
					userWhitelist: true,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: null,
				erc8213: supported({
					ref: refTodo,
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: null,
				}),
				transactionDetailsDisplay: displaysFullTransactionDetails,
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: null,
				}),
				erc20L1Transfer: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				ethL1Transfer: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: refTodo,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: false,
					walletServiceFeeDisplayUnits: 'NOT_APPLICABLE' as const,
				}),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: {
					[Variant.BROWSER]: supported<ArtifactSigningDetails>({
						ref: [
							{
								explanation:
									'Web release tags are GPG-signed by a CI-held key, and the release tarball gets a GitHub build provenance attestation (actions/attest, Sigstore).',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml',
							},
						],
						publication: 'SIGSTORE_REKOR',
						signer: 'BUILD_INFRA_IDENTITY',
					}),
					[Variant.MOBILE]: notSupportedWithRef({
						ref: {
							explanation:
								'Safe{Mobile} is built on the Expo EAS cloud service and signed for the app stores; no signatures or attestations are published.',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/apps/mobile/eas.json',
						},
					}),
				},
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'yarn.lock is committed and CI installs with `yarn install --immutable`; npm packages must be at least 7 days old.',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/actions/yarn/action.yml',
						},
					],
				}),
				dependencySandboxing: notSupportedWithRef({
					ref: {
						explanation:
							'No runtime dependency isolation such as LavaMoat. `.yarnrc.yml` sets `enableScripts: false`, which blocks install scripts but does not sandbox dependencies at runtime.',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.yarnrc.yml',
					},
				}),
				dependencyVulnerabilityScanning: supported({
					ref: [
						{
							explanation:
								'Dependabot runs weekly for npm and GitHub Actions dependencies, and pull requests merged into protected branches require CodeQL code scanning.',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/dependabot.yml',
						},
					],
				}),
				hasPublicChangelog: {
					[Variant.BROWSER]: supported({
						ref: {
							label: 'Safe{Wallet} releases',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/releases',
						},
					}),
					[Variant.MOBILE]: supported({
						ref: {
							explanation:
								'Safe{Mobile} release notes are published with each App Store version (e.g. 1.0.16, 2026-09-29).',
							url: 'https://apps.apple.com/us/app/safe-mobile/id6748754793',
						},
					}),
				},
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The web release build installs dependencies and injects build-time secrets (API keys) during the build job; mobile builds run on the Expo EAS cloud service.',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml',
						},
					],
				}),
				repositoryChangeControls: {
					ref: [
						{
							explanation:
								'Organization rule sets on main, dev, and release branches require a pull request with one approving code-owner review, CodeQL code scanning and signed commits, and block deletion and force-pushes. Tag rule sets block deletion and rewrites of all tags.',
							url: 'https://api.github.com/repos/safe-global/safe-wallet-monorepo/rules/branches/dev',
						},
					],
					branchDeletionBlocked: true,
					forcePushBlocked: true,
					requiredChecks: true,
					requiredReview: true,
					tagsImmutable: true,
				},
				reproducibleBuilds: notSupportedWithRef({
					ref: {
						explanation:
							'No reproducible build process is documented, and WalletScrutiny has no entry for Safe{Wallet}.',
						url: 'https://github.com/safe-global/safe-wallet-monorepo',
					},
				}),
			},
		},
		walletCall: supported({
			ref: {
				explanation: 'Safe supports EIP-5792 for transaction batching.',
				url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/f918ceb9b561dd3a27af96903071cd56c1fb5ddd/apps/web/src/services/safe-wallet-provider/index.ts#L184',
			},
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
