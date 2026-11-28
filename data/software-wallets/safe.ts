import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { ackee } from '@/data/entities/ackee'
import { certora } from '@/data/entities/certora'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
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
import { FeeDisplayLevel, FeeType } from '@/schema/features/transparency/fee-display' // for level
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license' // assuming path
import {
	type ArtifactSigningDetails,
	RepositoryChangeControlState,
} from '@/schema/features/transparency/release-transparency'
import { type MustRef, refNotNecessary, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const safe: SoftwareWallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [nconsigny, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-11-28',
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
			[Variant.BROWSER]: {
				ref: [
					{
						explanation:
							"The address field looks up ENS names on Ethereum through the app's own node connection, or through the user's custom node if one is set.",
						urls: [
							{
								label: 'Name resolver hook',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/components/common/AddressInput/useNameResolver.ts#L21-L36',
							},
							{
								label: 'ENS hub provider',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/hooks/useEnsHubProvider.ts#L31-L45',
							},
							{
								label: 'ENS resolution',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/ens.ts#L67-L82',
							},
						],
					},
					{
						explanation:
							'An address with a network prefix is accepted only when the prefix matches the current network. Other chain-specific address formats are not recognized.',
						urls: [
							{
								label: 'Prefix parsing',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/addresses.ts#L37-L54',
							},
							{
								label: 'Prefix validation',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/packages/utils/src/utils/validation.ts#L20-L32',
							},
						],
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
			[Variant.MOBILE]: {
				ref: [
					{
						explanation:
							'The send and address book fields accept only plain addresses, not ENS names.',
						urls: [
							{
								label: 'Recipient validation',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/Send/hooks/useRecipientValidation.ts#L51-L62',
							},
							{
								label: 'Contact schema',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/AddressBook/Contact/schemas/contactSchema.ts#L13-L28',
							},
						],
					},
				],
				chainSpecificAddressing: {
					erc7828: notSupported,
					erc7831: notSupported,
				},
				nonChainSpecificEnsResolution: notSupported,
			},
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
						explanation: 'The Safe{Wallet} web and mobile apps are licensed under GPL-3.0.',
						label: 'Safe License File',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/LICENSE#L1-L2',
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
						'Safe, then called Gnosis Safe, raised $100 million in 2022 in a round led by the venture firm 1kx.',
					label: 'Safe funding announcement',
					url: 'https://safefoundation.org/blog/gnosis-safe-raises-usd100-million-led-by-1kx-to-unlock-digital-asset',
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
				ventureCapital: true,
			},
		},
		multiAddress: supported({
			ref: [
				{
					explanation:
						'Both apps keep a list of Safe accounts, and users can create or add existing accounts.',
					urls: [
						{
							label: 'Web: accounts list',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/web/src/features/myAccounts/components/AccountsHeader/index.tsx#L54-L69',
						},
						{
							label: 'Mobile: add existing account',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/6ca3977268dd2635957193b0bd55e4437b4570ea/apps/mobile/src/features/AccountsSheet/MyAccounts/MyAccountsFooter.tsx#L29-L37',
						},
					],
				},
			],
		}),
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
				ethereumL1: notSupportedWithRef({
					ref: [
						{
							explanation:
								'With its Ethereum RPC set to a test proxy that reports false ERC-20 balances, Safe shows the real balance of 1.99988 USDC. Safe does not get token balances from the RPC endpoint.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-usdc-balance.png',
							label: 'Safe web app asset list showing 1.99988 USDC',
						},
						{
							explanation:
								'The maximum amount that Safe lets the user send is the real balance of 1.999883 USDC.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-send-usdc.png',
							label: 'Safe web app send screen for USDC',
						},
						{
							explanation:
								'The Ethereum RPC provider is set to a local test proxy that reports false ERC-20 balances.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-custom-rpc.png',
							label: 'Safe web app Environment variables page with a custom RPC provider',
						},
						{
							explanation:
								'Safe sends `eth_chainId`, `eth_getCode`, `eth_call` and `eth_accounts` requests through the proxy. None of them is an ERC-20 balance query, so the proxy does not change a balance.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-lying-proxy-log.png',
							label: 'Log of the lying RPC proxy during the Safe test',
						},
						{
							explanation:
								'Safe loads token balances from the Safe Client Gateway at `safe-client.safe.global`, not from the RPC endpoint that the user sets.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-balance-request.png',
							label: 'Browser network log of the Safe balance request',
						},
						{
							explanation:
								'The Safe Client Gateway returns the USDC balance as 1999883 base units, which is 1.999883 USDC. Safe shows this value with no verification against the chain.',
							file: 'public/references/wallets/safe/screenshots/2026-11-23-safe-browser-balance-response.png',
							label: 'Safe Client Gateway response with the USDC balance',
						},
						{
							explanation:
								'Safe gets token balances from the balances endpoint of the Safe Client Gateway.',
							label: 'Safe balance query to the Safe Client Gateway',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/ad1f9fd9d9b1ef2885aad0e6fec56ee051067f88/packages/store/src/gateway/AUTO_GENERATED/balances.ts#L1-L18',
						},
					],
				}),
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
									"Safe's release system signs each web release and publishes a signed record of the release archive on the public Sigstore log.",
								urls: [
									{
										label: 'Signed release tag',
										url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml#L69-L71',
									},
									{
										label: 'Release archive attestation',
										url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.github/workflows/web-tag-release.yml#L206-L213',
									},
								],
							},
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
					[Variant.MOBILE]: notSupportedWithRef({
						ref: [
							{
								explanation:
									"Safe builds the mobile app with the Expo build service. The public production build profile does not set `EAS_NO_FROZEN_LOCKFILE`. However, it uses the `production` environment, which also loads private environment variables from Safe's Expo account.",
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/eas.json#L7-L15,L44-L61',
							},
							{
								explanation:
									'The mobile app uses Expo SDK 55 and React Native 0.83. These versions meet the version condition of the Expo build service for a frozen lockfile.',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/35070b7353c03fe1007f04b48f58cd0ca2afe00e/apps/mobile/package.json#L97,L122',
							},
							{
								explanation:
									'The Expo build service uses a frozen lockfile for Expo SDK 53 or newer and React Native 0.79 or newer, but only if `EAS_NO_FROZEN_LOCKFILE` is not set. A private environment variable can set it, so the public build configuration does not decide this.',
								url: 'https://github.com/expo/eas-cli/blob/f4b4f035b04a42618ef0338f84ef621dc5511221/packages/build-tools/src/utils/packageManager.ts#L137-L164',
							},
							{
								explanation:
									'With Yarn 2 or newer, a frozen lockfile install runs `yarn install --immutable`. Otherwise, the install runs `yarn install --no-immutable`, which can change `yarn.lock`. Public evidence does not show that the mobile release build locks its dependencies.',
								url: 'https://github.com/expo/eas-cli/blob/f4b4f035b04a42618ef0338f84ef621dc5511221/packages/build-tools/src/common/installDependencies.ts#L43-L54',
							},
						],
					}),
				},
				dependencySandboxing: notSupportedWithRef({
					ref: {
						explanation:
							'Dependencies are not isolated from each other or from the app when it runs. This setting only stops dependencies from running scripts during installation.',
						label: 'Install scripts setting',
						url: 'https://github.com/safe-global/safe-wallet-monorepo/blob/d09c30200d532d36570f4b8c6b886130ebdf7170/.yarnrc.yml#L7',
					},
				}),
				dependencyVulnerabilityScanning: supported<WithRef<{}>>({
					ref: {
						explanation:
							'Dependabot watches dependencies for known security flaws and opens updates to fixed versions, as in these examples.',
						urls: [
							{
								label: 'Security update for `fast-uri`',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/pull/8829',
							},
							{
								label: 'Security update for `proxy-addr`',
								url: 'https://github.com/safe-global/safe-wallet-monorepo/pull/8964',
							},
						],
					},
				}),
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
				repositoryChangeControls: {
					ref: [
						{
							explanation:
								'The main branch, which releases are built from, cannot be deleted or force-pushed, and changes must go through a pull request. Its public rules do not require an approving review or passing checks.',
							label: 'Rules for the main branch',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/rules/15670114',
						},
						{
							explanation: 'Release tags cannot be deleted or moved.',
							label: 'Rules for tags',
							url: 'https://github.com/safe-global/safe-wallet-monorepo/rules/16698869',
						},
					],
					branchDeletionBlocked: RepositoryChangeControlState.VERIFIABLY_PRESENT,
					forcePushBlocked: RepositoryChangeControlState.VERIFIABLY_PRESENT,
					requiredChecks: RepositoryChangeControlState.UNVERIFIABLE,
					requiredReview: RepositoryChangeControlState.UNVERIFIABLE,
					tagsImmutable: RepositoryChangeControlState.VERIFIABLY_PRESENT,
				},
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
