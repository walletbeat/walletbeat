import { z0r0z } from '@/data/contributors/z0r0z'
import { shredSecurity } from '@/data/entities/shred-security'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

/**
 * Multisig (multisig.software) is a k-of-n smart contract multisig with the
 * timelock built into the wallet contract. Deployed as 45-byte factory clones,
 * and usable as an EIP-7702 delegation target for an existing EOA.
 */
export const multisig: SoftwareWallet = {
	metadata: {
		id: 'multisig',
		displayName: 'Multisig',
		tableName: 'Multisig',
		contributors: [z0r0z],
		iconExtension: 'svg',
		lastUpdated: '2026-08-17',
		urls: {
			docs: ['https://www.multisig.software/docs'],
			repositories: ['https://github.com/src-company/multisig'],
			websites: ['https://www.multisig.software'],
		},
	},
	features: {
		accountSupport: null,
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
			ref: [
				{
					explanation:
						'The interface enumerates its RPC hosts in a `connect-src` Content-Security-Policy directive, and initializes its provider with an `rpcMap` for the single chain it is given. There is no setting to change a chain RPC endpoint, and a user-supplied endpoint would be blocked by the page policy rather than used.',
					label: 'Interface source and its Content-Security-Policy',
					url: 'https://github.com/src-company/multisig/blob/e33c36d0a637a9bd97779f710bbaf59d34832c99/dapp/index.html',
				},
			],
			customChainRpcEndpoint: notSupported,
			l1: null,
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.NO,
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
				ref: {
					label: 'LICENSE',
					url: 'https://github.com/src-company/multisig/blob/e33c36d0a637a9bd97779f710bbaf59d34832c99/LICENSE',
				},
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'The published fact sheet states no token and no fees. There is no fee switch, no treasury cut and no token contract in the repository; the deployed contracts are immutable and take nothing on deployment or execution.',
					label: 'Fact sheet',
					url: 'https://www.multisig.software/brand',
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
				transparentConvenienceFees: false,
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
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			// SECURITY.md gives a reporting path, but no rewards or scope.
			bugBountyProgram: notSupported,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation:
								'The cover page of this report is marked DRAFT. It is the only external human review of the contracts, and its text is reproduced in the repository alongside the developer response to each finding.',
							label: 'Shred Security audit report (PDF)',
							url: 'https://audit.multisig.wei.limo',
						},
						{
							label: 'Report text with developer responses',
							url: 'https://github.com/src-company/multisig/blob/e33c36d0a637a9bd97779f710bbaf59d34832c99/audit/report-shred-security.md',
						},
					],
					auditDate: '2026-07-11',
					auditor: shredSecurity,
					codeSnapshot: {
						commit: '2329339',
						date: '2026-04-07',
					},
					// 0 high, 0 medium; the rest are below the tracked threshold.
					unpatchedFlaws: 'NONE_FOUND',
					variantsScope: 'ALL_VARIANTS',
				},
			],
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
				artifactSigning: null,
				dependencyLocking: null,
				// No CI workflows in the repository.
				dependencyVulnerabilityScanning: notSupported,
				// No releases, tags or changelog.
				hasPublicChangelog: notSupported,
				hermeticBuilds: null,
				repositoryChangeControls: {
					ref: [
						{
							explanation:
								'`main` is unprotected: the GitHub branches API reports `protected: false` with no required status checks. There are no required reviews, force-push is not blocked, and the repository publishes no tags or releases. A push to `main` deploys the interface directly.',
							label: 'Multisig repository',
							url: 'https://github.com/src-company/multisig',
						},
					],
					branchDeletionBlocked: false,
					forcePushBlocked: false,
					requiredChecks: false,
					requiredReview: false,
					tagsImmutable: false,
				},
				reproducibleBuilds: null,
			},
		},
		walletCall: null,
	},
	variants: {
		// The interface is a static dapp; no extension, mobile or desktop build.
		[Variant.BROWSER]: true,
	},
}
