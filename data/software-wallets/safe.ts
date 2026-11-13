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
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeDisplayLevel, FeeType } from '@/schema/features/transparency/fee-display' // for level
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license' // assuming path
import { type ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { type MustRef, refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2026-11-13',
		urls: {
			docs: ['https://docs.safe.global/'],
			repositories: ['https://github.com/safe-fndn'],
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
						explanation: 'Safe uses the LGPL-3.0 license for its source code',
						label: 'Safe License File',
						url: 'https://github.com/safe-global/safe-wallet-monorepo',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'SafeDAO has received ecosystem grants. This Optimism governance forum post is an example grant proposal.',
					url: 'https://gov.optimism.io/t/draft-gf-phase-1-proposal-old-template-safe/3400',
				},
				{
					explanation:
						'Safe community updates covering grants and RPGF-related support across ecosystems.',
					url: 'https://forum.safe.global/t/safedao-community-updates/4213',
				},
				{
					explanation:
						'Community‑Aligned Fees: revenue (e.g., Native Swaps) pledged to SafeDAO. The fee approach is explained publicly.',
					url: 'https://safefoundation.org/blog/safedao-community-aligned-fees-introduction',
				},
				{
					explanation:
						'SAFE tokenomics and governance scope. The token is currently used primarily for SafeDAO treasury resource allocation (e.g., grants).',
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
				ventureCapital: false,
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
						url: 'https://github.com/safe-fndn/safe-modules/blob/1e57772571fc72471b7bc3203fde9b1799fb87d4/modules/passkey/contracts/verifiers/FCLP256Verifier.sol#not-line-specific',
					},
				],
				details: 'Safe uses FreshCryptoLib for passkey verification in their 4337 modules.',
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl:
					'https://github.com/safe-fndn/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
			}),
			publicSecurityAudits: [
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Certora.pdf#binary-file',
					auditDate: '2025-01-14',
					auditor: certora,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/safe-fndn/safe-smart-account/blob/a0f4c3691fc4385ceb09785b0c0b76f5a2d09c20/docs/Safe_Audit_Report_1_5_0_Ackee.pdf#binary-file',
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
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: true,
							[FeeType.WALLET_FEE]: true,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				erc20L1Transfer: supported({
					ref: refTodo,
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				ethL1Transfer: supported({
					ref: refTodo,
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: false,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
				uniswapUSDCToEtherSwap: supported({
					ref: refTodo,
					fees: {
						feesInvolved: {
							[FeeType.NETWORK_FEE]: true,
							[FeeType.ONCHAIN_APP_FEE]: true,
							[FeeType.WALLET_FEE]: false,
						},
						shownAfterSingleAction: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
						shownByDefault: {
							comprehensiveness: FeeDisplayLevel.COMPREHENSIVE,
							units: null,
						},
					},
				}),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: {
					[Variant.BROWSER]: supported<ArtifactSigningDetails>({
						ref: [
							{
								explanation:
									'The web release job can write attestations. It uses `actions/attest` to create a signed build provenance attestation for the release archive.',
								label: 'Safe web release workflow',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/.github/workflows/web-tag-release.yml#L100-L104,L214-L217',
							},
							{
								explanation:
									'GitHub publishes the attestations of the Safe repository. Each attestation is signed with the identity of the GitHub Actions workflow that built the artifact.',
								label: 'Safe repository attestations',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/attestations',
							},
							{
								explanation:
									'The attestation for the `web-v1.105.0` release archive is in the public Sigstore transparency log.',
								label: 'Sigstore transparency log entry',
								url: 'https://search.sigstore.dev/?logIndex=3669618074',
							},
						],
						publication: 'SIGSTORE_REKOR',
						signer: 'BUILD_INFRA_IDENTITY',
					}),
					[Variant.MOBILE]: notSupported,
				},
				dependencyAgeGate: null,
				dependencyLocking: {
					[Variant.BROWSER]: supported({
						ref: [
							{
								explanation:
									'The shared Yarn setup action installs dependencies with `yarn install --immutable`, which fails if `yarn.lock` would change.',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/.github/actions/yarn/action.yml#L65-L68',
							},
							{
								explanation:
									'The web release job uses this action to install dependencies before it builds the release.',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/.github/workflows/web-tag-release.yml#L143-L148',
							},
						],
					}),
					[Variant.MOBILE]: supported({
						ref: [
							{
								explanation:
									'Safe builds the mobile app with the Expo build service. The production build profile does not set `EAS_NO_FROZEN_LOCKFILE`.',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/eas.json#L7-L15,L44-L61',
							},
							{
								explanation: 'The mobile app uses Expo SDK 55 and React Native 0.83.',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/package.json#L97,L122',
							},
							{
								explanation:
									'The Expo build service uses a frozen lockfile for Expo SDK 53 or newer and React Native 0.79 or newer, unless the build sets `EAS_NO_FROZEN_LOCKFILE`.',
								url: 'https://github.com/expo/eas-cli/blob/f4b4f035b04a42618ef0338f84ef621dc5511221/packages/build-tools/src/utils/packageManager.ts#L137-L164',
							},
							{
								explanation:
									'With Yarn 2 or newer, a frozen lockfile install runs `yarn install --immutable`, which fails if `yarn.lock` would change.',
								url: 'https://github.com/expo/eas-cli/blob/f4b4f035b04a42618ef0338f84ef621dc5511221/packages/build-tools/src/common/installDependencies.ts#L43-L54',
							},
						],
					}),
				},
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: {
					[Variant.BROWSER]: supported({
						ref: {
							explanation: 'Safe publishes web app release notes via GitHub Releases.',
							label: 'Safe web app releases on GitHub',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/releases',
						},
					}),
					[Variant.MOBILE]: supported<MustRef<{}>>({
						ref: [
							{
								explanation:
									'The App Store version history lists release notes for each version of the Safe mobile app.',
								label: 'Safe mobile app on the App Store',
								url: 'https://apps.apple.com/us/app/safe-mobile/id6748754793',
							},
							{
								explanation:
									'The iOS and Android apps are built from one app configuration with one version number, so the App Store version history also covers the Android releases.',
								label: 'Safe mobile app version',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/app.config.ts#L30-L34',
							},
							{
								explanation:
									'The Google Play listing shows the release notes of the latest Android version only.',
								label: 'Safe mobile app on Google Play',
								url: 'https://play.google.com/store/apps/details?id=global.safe.mobileapp',
							},
						],
					}),
				},
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: notSupported,
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
