import { patrickalphac } from '@/data/contributors'
import { claveAccount } from '@/data/wallet-contracts/base-clave-account'
import { WalletProfile } from '@/schema/features/profile'
import { License } from '@/schema/features/transparency/license'
import { notSupported, supported } from '@/schema/features/support'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	Leak,
	MultiAddressPolicy,
	RegularEndpoint,
} from '@/schema/features/privacy/data-collection'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { claveEntity } from '../entities/clave'
import { aws } from '../entities/aws'
import { aiprise } from '../entities/aiprise'
import { cantina } from '../entities/cantina'
import { nethermind } from '../entities/nethermind'

export const unratedTemplate: SoftwareWallet = {
	metadata: {
		id: 'clave',
		displayName: 'Clave',
		tableName: 'Clave',
		blurb: paragraph(`
			Clave is a self-custodial smart account wallet crypto app for investing, earning yield, and payment. It's native to the ZKsync Era L2 powered by native account abstraction.
		`),
		contributors: [patrickalphac],
		iconExtension: 'svg',
		lastUpdated: '2025-07-03',
		repoUrl: 'https://github.com/getclave/clave-contracts',
		url: 'https://www.getclave.com/',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.erc4337,
			erc4337: supported({
				contract: claveAccount,
				controllingSharesInSelfCustodyByDefault: 'YES',
				// Question: Technically, I can always send a transaction because I'm a developer... But I will often use their prioprietary API to generate transactions... What should we put?
				tokenTransferTransactionGeneration: TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				keyRotationTransactionGeneration: TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			eoa: supported({
				canExportPrivateKey: false,
				canExportSeedPhrase: false,
				keyDerivation: {
					type: 'NONSTANDARD'
				}
			}),
			mpc: notSupported,
			eip7702: notSupported,
		},
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: supported({
				medium: 'CHAIN_CLIENT',
			}),
			ref: null,
		},
		chainAbstraction: null,
		chainConfigurability: {
			customChains: false,
			l1RpcEndpoint: RpcEndpointConfiguration.NO,
			otherRpcEndpoints: RpcEndpointConfiguration.NO ,
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
			eip5792: null,
		},
		license: {
			license: License.GPL_3_0,
			ref: 'https://github.com/getclave/clave-contracts/blob/master/LICENSE',
		},
		monetization: {
			ref: null,
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
				ventureCapital: null,
			},
		},
		multiAddress: notSupported,
		privacy: {
			dataCollection: {
				collectedByEntities: [
					{
						entity: claveEntity,
						leaks: {
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							mempoolTransactions: Leak.ALWAYS,
							multiAddress: {
								type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
							},
							pseudonym: Leak.OPT_IN,
							ref: [
								{
									explanation: 'Clave collects device information, usage data, and transaction information as described in their privacy policy.',
									url: 'https://www.getclave.com/privacy-policy',
								},
							],
							walletAddress: Leak.ALWAYS,
						},
					},
					{
						entity: aws,
						leaks: {
							endpoint: RegularEndpoint,
							ipAddress: Leak.ALWAYS,
							ref: [
								{
									explanation: 'Clave uses AWS for cloud storage and processing, which may store personal data in data centers outside the UK.',
									url: 'https://www.getclave.com/privacy-policy',
								},
							],
						},
					},
					{
						entity: aiprise,
						leaks: {
							endpoint: RegularEndpoint,
							ipAddress: Leak.OPT_IN,
							ref: [
								{
									explanation: 'AiPrise is used for KYC verification when users access Rain Card or Onramp services through Clave.',
									url: 'https://aiprise.io/privacy-policy',
								},
							],
						},
					},
				],
				onchain: {
					pseudonym: Leak.OPT_IN,
					ref: {
						explanation: 'Users may optionally provide usernames which are stored onchain.',
						url: 'https://www.getclave.com/privacy-policy',
					},
				},
			},
			privacyPolicy: 'https://www.getclave.com/privacy-policy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				stealthAddresses: notSupported,
			},
		},
		profile: WalletProfile.PAYMENTS,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.NONE,
				upgradePathAvailable: false,
			},
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {},
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: null,
			publicSecurityAudits: [
				{
					auditDate: '2023-12-15',
					auditor: cantina,
					codeSnapshot: {
						date: '2023-12-15',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/zksync-accounts_151223_Cantina.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-03-20',
					auditor: cantina,
					codeSnapshot: {
						date: '2024-03-20',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/zksync-accounts-v2_20032024_Cantina.pdf.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-07-05',
					auditor: cantina,
					codeSnapshot: {
						date: '2024-07-05',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/ztake_05072024_Cantina.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-02-24',
					auditor: nethermind,
					codeSnapshot: {
						date: '2025-02-24',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/v2-zksync_24022025_Nethermind.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-07-01',
					auditor: cantina,
					codeSnapshot: {
						date: '2025-07-01',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/v1-zksync_01072025_Cantina.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2025-07-27',
					auditor: nethermind,
					codeSnapshot: {
						date: '2025-07-27',
					},
					ref: 'https://github.com/getclave/audits/blob/master/reports/v2-evm_27072025_Nethermind.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: null,
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			feeTransparency: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: true,
	},
}
