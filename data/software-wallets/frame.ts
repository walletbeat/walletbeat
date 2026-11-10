import { mattmatt } from '@/data/contributors/0xmattmatt'
import { lucemans } from '@/data/contributors/lucemans'
import { minimalsm } from '@/data/contributors/minimalsm'
import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { cure53 } from '@/data/entities/cure53'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, notSupportedWithRef, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import {
	type ArtifactSigningDetails,
	RepositoryChangeControlState,
} from '@/schema/features/transparency/release-transparency'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
export const frame: SoftwareWallet = {
	metadata: {
		id: 'frame',
		displayName: 'Frame',
		tableName: 'Frame',
		coinspectId: 'frame',
		contributors: [polymutex, nconsigny, lucemans, mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-18',
		urls: {
			docs: ['https://docs.frame.sh/'],
			repositories: ['https://github.com/floating/frame'],
			socials: {
				discord: 'https://discord.com/invite/rr4Yr3JkPq',
				x: 'https://x.com/0xFrame',
			},
			websites: ['https://frame.sh'],
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
						explanation:
							'The Frame desktop app and its browser extension are both licensed under GPL-3.0.',
						urls: [
							{
								label: 'Frame desktop license',
								url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/LICENSE#L1-L4',
							},
							{
								label: 'Frame extension license',
								url: 'https://github.com/frame-labs/frame-extension/blob/09d7848b6b4612314f13e107e3b5c56fb9fadfe0/LICENSE#L1-L2',
							},
						],
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Frame has no built-in swap feature.',
					label: 'Frame guide to token swaps',
					url: 'https://docs.frame.sh/docs/Guides/Performing%20DEX%20Swaps',
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
				ventureCapital: null,
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
				drills: notSupported,
				guardianRecovery: notSupportedWithRef({
					ref: {
						explanation:
							'Users can only restore an account by importing their own seed phrase, private key or keystore file, or by connecting a hardware wallet.',
						label: 'Add account options',
						url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/app/dash/Accounts/index.js#L81-L117',
					},
				}),
			},
			bugBountyProgram: notSupported,
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
						connectionTypes: [HardwareWalletConnection.QR],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.OTHER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							"Imported seed phrases and private keys are encrypted and stored on the user's computer. Hardware wallets keep their keys on the device.",
						urls: [
							{
								label: 'Encryption',
								url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/main/signers/hot/HotSigner/worker.js#L107-L131',
							},
							{
								label: 'Storage location',
								url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/main/signers/hot/HotSigner/index.js#L14-L17',
							},
						],
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation:
								'Cure53 tested and reviewed the code of the Frame desktop app in 2018. It found two low-severity and four informational issues.',
							label: 'Cure53 audit report',
							url: 'https://cure53.de/pentest-report_frame.pdf',
						},
					],
					auditDate: '2018-09-06',
					auditor: cure53,
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: { [Variant.DESKTOP]: true },
				},
			],
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: null,
				erc8213: null,
				transactionDetailsDisplay: null,
				transactionSimulations: null,
				// transactionDetailsDisplay: {
				// 	chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	from: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
				// 	to: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// },
			},
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
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: {
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: supported<ArtifactSigningDetails>({
						ref: [
							{
								explanation:
									'Frame Labs signs the macOS and Windows release builds with its own developer certificates and publishes them on GitHub. Linux builds are not signed.',
								urls: [
									{
										label: 'Signing certificates',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml#L37-L59',
									},
									{
										label: 'Publish to GitHub releases',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml#L86-L91',
									},
								],
							},
						],
						publication: 'GITHUB_RELEASE',
						signer: 'DEVELOPER_KEY',
					}),
				},
				dependencyAgeGate: null,
				dependencyLocking: {
					[Variant.BROWSER]: notSupportedWithRef({
						ref: {
							explanation:
								"The extension's build instructions don't enforce locked dependency versions.",
							label: 'Extension build instructions',
							url: 'https://github.com/frame-labs/frame-extension/blob/09d7848b6b4612314f13e107e3b5c56fb9fadfe0/README.md#L16-L19',
						},
					}),
					[Variant.DESKTOP]: supported<WithRef<{}>>({
						ref: [
							{
								explanation:
									"The desktop app's release build installs the exact dependency versions recorded in the repository.",
								urls: [
									{
										label: 'Install script',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/package.json#L10',
									},
									{
										label: 'Release build steps',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml#L67-L78',
									},
								],
							},
						],
					}),
				},
				dependencySandboxing: notSupported,
				dependencyVulnerabilityScanning: {
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: notSupportedWithRef({
						ref: [
							{
								explanation:
									"The desktop app's automated build and release steps don't check dependencies for known vulnerabilities.",
								urls: [
									{
										label: 'Automated test workflow',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/compile-and-test.yml#L15-L33',
									},
									{
										label: 'Release workflow',
										url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml#L61-L91',
									},
									{
										label: 'Repository settings folder',
										url: 'https://github.com/floating/frame/tree/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github',
									},
								],
							},
							{
								explanation:
									'Automatic security update requests stopped in September 2023, and the last one was never merged.',
								urls: [
									{
										label: 'Automatic update requests',
										url: 'https://github.com/floating/frame/pulls?q=is%3Apr+author%3Aapp%2Fdependabot',
									},
									{
										label: 'Last automatic security update request',
										url: 'https://github.com/floating/frame/pull/1658',
									},
								],
							},
						],
					}),
				},
				hasPublicChangelog: {
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: supported({
						ref: {
							explanation: 'Each desktop release on GitHub lists its changes.',
							label: 'Frame desktop releases',
							url: 'https://github.com/floating/frame/releases',
						},
					}),
				},
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The desktop release build downloads system tools and packages from the internet while it runs. The extension has no automated build.',
							label: 'Release build steps',
							url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml#L67-L78',
						},
					],
				}),
				repositoryChangeControls: {
					[Variant.BROWSER]: {
						ref: [
							{
								explanation: "GitHub reports the extension's default branch as not protected.",
								label: 'Extension branch settings',
								url: 'https://api.github.com/repos/frame-labs/frame-extension/branches/master',
							},
						],
						branchDeletionBlocked: RepositoryChangeControlState.VERIFIABLY_ABSENT,
						forcePushBlocked: RepositoryChangeControlState.VERIFIABLY_ABSENT,
						requiredChecks: RepositoryChangeControlState.VERIFIABLY_ABSENT,
						requiredReview: RepositoryChangeControlState.VERIFIABLY_ABSENT,
						tagsImmutable: RepositoryChangeControlState.VERIFIABLY_ABSENT,
					},
					[Variant.DESKTOP]: null,
				},
				reproducibleBuilds: notSupported,
			},
		},
		walletCall: null,
	},
	variants: {
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: true,
	},
}
