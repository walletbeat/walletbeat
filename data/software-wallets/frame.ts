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
import { type ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
export const frame: SoftwareWallet = {
	metadata: {
		id: 'frame',
		displayName: 'Frame',
		tableName: 'Frame',
		coinspectId: 'frame',
		contributors: [polymutex, nconsigny, lucemans, mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
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
							'Frame desktop is GPL-3.0 ("Copyright (C) 2021 Frame Labs, Inc."); the companion browser extension (frame-labs/frame-extension) is also GPL-3.0.',
						url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			// Frame has no built-in swap, bridge or onramp; swaps go through external apps with Frame as an injected wallet, so Frame takes no convenience fees.
			ref: [
				{
					explanation:
						'Frame interacts with apps as an injected wallet; the swap guide uses an external decentralized exchange and mentions no Frame fee.',
					label: 'Frame documentation',
					url: 'https://docs.frame.sh/',
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
				// Recovery is only by re-importing the user's own seed phrase, private key or keystore, or using a hardware wallet; no social, cloud or vendor-assisted recovery exists in the code.
				// Source: https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/app/dash/Notify/index.js
				guardianRecovery: notSupported,
			},
			// No bug bounty, SECURITY.md or disclosure policy in either repo or on frame.sh / docs.frame.sh.
			// Source: https://github.com/floating/frame
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
							'Hot signer secrets (an imported seed or private key) are encrypted locally with AES-256 using a scrypt-derived key and stored in the app data folder; hardware signers keep keys on the device.',
						url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/main/signers/hot/HotSigner/worker.js',
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
								'Cure53 white-box penetration test and code audit of the Frame Electron app (August-September 2018): two Low and four Informational findings, all fixed in v0.0.7.',
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
					// The extension is signed only by the Chrome Web Store and Firefox Add-ons.
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: supported<ArtifactSigningDetails>({
						ref: [
							{
								explanation:
									'Release builds are code-signed in CI with Frame Labs Apple Developer (notarized) and Windows certificates and published as GitHub release assets; Linux builds are unsigned and no detached signatures are published.',
								url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml',
							},
						],
						publication: 'GITHUB_RELEASE',
						signer: 'DEVELOPER_KEY',
					}),
				},
				dependencyLocking: {
					// The extension commits package-lock.json but has no CI, and the README builds with `npm install`.
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: supported({
						ref: [
							{
								explanation:
									'package-lock.json is committed and CI installs with `npm ci` (the `setup:ci` script).',
								url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/package.json',
							},
						],
					}),
				},
				// Desktop gates install scripts with @lavamoat/allow-scripts but has no runtime LavaMoat policy; the extension has neither.
				// Source: https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/package.json
				dependencySandboxing: notSupported,
				dependencyVulnerabilityScanning: {
					[Variant.BROWSER]: notSupported,
					// Dependabot security update PRs are opened for the desktop repo (repository setting), but several remain unmerged, e.g. #1658 (Electron, 2023).
					[Variant.DESKTOP]: supported({
						ref: [
							{
								explanation:
									'Dependabot security update pull requests are opened for the desktop repository.',
								url: 'https://github.com/floating/frame/pull/1658',
							},
						],
					}),
				},
				hasPublicChangelog: {
					// The extension repository has no release notes or changelog.
					[Variant.BROWSER]: notSupported,
					[Variant.DESKTOP]: supported({
						ref: 'https://github.com/floating/frame/releases',
					}),
				},
				hermeticBuilds: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The desktop release workflow runs `apt update`, `pip install` and `npm ci` on GitHub-hosted runners during the build; the extension has no build workflow.',
							url: 'https://github.com/floating/frame/blob/dac4378979fe1f490f4d0bf141dc19c201d2cb58/.github/workflows/build.yml',
						},
					],
				}),
				repositoryChangeControls: {
					// The extension repository's master branch is unprotected and has no rulesets.
					[Variant.BROWSER]: {
						ref: [
							{
								explanation: 'GitHub reports the frame-extension master branch as not protected.',
								url: 'https://api.github.com/repos/frame-labs/frame-extension/branches/master',
							},
						],
						branchDeletionBlocked: false,
						forcePushBlocked: false,
						requiredChecks: false,
						requiredReview: false,
						tagsImmutable: false,
					},
					// Desktop branches are protected, but whether reviews are required is not visible to non-admins.
					[Variant.DESKTOP]: null,
				},
				// No reproducible build process is documented for either variant.
				// Source: https://github.com/floating/frame
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
