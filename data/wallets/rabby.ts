import { Leak, MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import { deBank } from '../entities/debank'
import { polymutex } from '../contributors/polymutex'
import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { License } from '@/schema/features/license'
import { WalletProfile } from '@/schema/features/profile'
import { RpcEndpointConfiguration } from '@/schema/features/chain-configurability'
import { leastAuthority } from '../entities/least-authority'
import { slowMist } from '../entities/slowmist'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import { cure53 } from '../entities/cure53'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { AccountType } from '@/schema/features/account-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'

export const rabby: Wallet = {
	metadata: {
		id: 'rabby',
		displayName: 'Rabby',
		tableName: 'Rabby',
		iconExtension: 'svg',
		blurb: paragraph(`
			Rabby is a user-friendly Ethereum wallet focusing on smooth UX and security.
			It features an intuitive transaction preview feature and works on many chains.
		`),
		url: 'https://rabby.io',
		repoUrl: 'https://github.com/RabbyHub/Rabby',
		contributors: [polymutex],
		lastUpdated: '2024-12-15',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: {
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			customChains: true,
		},
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eoa: supported({
				canExportPrivateKey: true,
				keyDerivation: {
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
					type: 'BIP32',
					canExportSeedPhrase: true,
				},
			}),
			eip7702: notSupported,
			mpc: notSupported,
			rawErc4337: notSupported,
		},
		multiAddress: featureSupported,
		addressResolution: {
			nonChainSpecificEnsResolution: notSupported,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			ref: [
				{
					url: 'https://github.com/RabbyHub/Rabby/blob/5f2b84491b6af881ab4ef41f7627d5e068d10652/src/ui/views/ImportWatchAddress.tsx#L170',
					explanation:
						'Rabby supports resolving plain ENS addresses when importing watch addresses, but not when sending funds.',
				},
			],
		},
		integration: {
			browser: {
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
				ref: [
					{
						url: 'https://github.com/RabbyHub/Rabby/blob/develop/src/background/utils/buildinProvider.ts',
						explanation:
							'Rabby implements the EIP-1193 Provider interface and injects it into web pages. EIP-2700 and EIP-6963 are also supported.',
					},
				],
			},
		},
		security: {
			scamAlerts: {
				scamUrlWarning: supported({
					leaksVisitedUrl: 'FULL_URL',
					leaksIp: true,
					ref: [
						{
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
							label: 'Rabby API code on npmjs.com',
							explanation:
								'Rabby checks whether the URL you are visiting is on a scam list. It sends the URL along with Ethereum address in non-proxied HTTP requests for API methods `getOriginIsScam`, `getOriginPopularityLevel`, `getRecommendChains`, and others.',
						},
					],
				}),
				contractTransactionWarning: supported({
					previousContractInteractionWarning: true,
					recentContractWarning: true,
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					ref: [
						{
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
							label: 'Rabby API code on npmjs.com',
							explanation:
								'Rabby checks whether the contract you are visiting is on a scam list. It sends the contract along with Ethereum address in non-proxied HTTP requests for API method `unexpectedAddrList`.',
						},
					],
				}),
				sendTransactionWarning: supported({
					userWhitelist: true,
					newRecipientWarning: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
				}),
			},
			publicSecurityAudits: [
				{
					auditor: slowMist,
					auditDate: '2021-06-18',
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/Rabby%20chrome%20extension%20Penetration%20Testing%20Report.pdf',
					variantsScope: { browser: true },
					codeSnapshot: {
						date: '2021-06-23',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: slowMist,
					auditDate: '2022-03-18',
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/SlowMist%20Audit%20Report%20-%20Rabby%20browser%20extension%20wallet-2022.03.18.pdf',
					variantsScope: { browser: true },
					codeSnapshot: {
						date: '2022-01-26',
						commit: 'f6d19bd70664a7214677918e298619d583f9c3f1',
						tag: 'v0.21.1',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: slowMist,
					auditDate: '2023-07-20',
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet-2023.07.20.pdf',
					variantsScope: { browser: true },
					codeSnapshot: {
						date: '2023-06-19',
						commit: 'f6221693b877b3c4eb1c7ac61146137eb1908997',
						tag: 'v0.91.0',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: slowMist,
					auditDate: '2023-09-26',
					ref: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet%20Desktop.pdf',
					variantsScope: { desktop: true },
					codeSnapshot: {
						date: '2023-09-01',
						commit: '586447a46bcd0abab6356076e369357050c97796',
						tag: 'v0.33.0-prod',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: leastAuthority,
					auditDate: '2024-10-18',
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/Least%20Authority%20-%20Debank%20Rabby%20Walle%20Audit%20Report.pdf',
					variantsScope: { mobile: true },
					codeSnapshot: {
						date: '2024-09-08',
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
					},
					unpatchedFlaws: [
						{
							name: 'Issue B: Insecure Key Derivation Function',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'Issue C: Weak Encryption Method Used',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'Issue D: Weak PBKDF2 Parameters Used',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
							presentStatus: 'NOT_FIXED',
						},
					],
				},
				{
					auditor: cure53,
					auditDate: '2024-10-22',
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/Cure53%20-%20Debank%20Rabby%20Wallet%20Audit%20Report.pdf',
					variantsScope: { mobile: true },
					codeSnapshot: {
						date: '2024-09-08',
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
					},
					unpatchedFlaws: [
						{
							name: 'RBY-01-001 WP1-WP2: Mnemonic recoverable via process dump',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'RBY-01-002 WP1-WP2: Password recoverable via process dump',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'RBY-01-012 WP1-WP2: RabbitCode secret recoverable from installer files',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'RBY-01-014 WP1-WP2: Backup password prompt bypassable',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
							presentStatus: 'NOT_FIXED',
						},
						{
							name: 'RBY-01-003 WP1-WP2: Lack of rate limiting for password unlock',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
							presentStatus: 'NOT_FIXED',
						},
					],
				},
				{
					auditor: slowMist,
					auditDate: '2024-10-23',
					variantsScope: { mobile: true },
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/SlowMist%20Audit%20Report%20-%20Rabby%20mobile%20wallet%20iOS.pdf',
					codeSnapshot: {
						date: '2024-06-17',
						commit: 'a424dbe54bba464da7585769140f6b7136c9108b',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: leastAuthority,
					auditDate: '2024-12-12',
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/docs/Least%20Authority%20-%20DeBank%20Rabby%20Wallet%20Extension%20Final%20Audit%20Report-20241212.pdf',
					variantsScope: { browser: true },
					codeSnapshot: {
						date: '2024-10-14',
						commit: 'eb5da18727b38a3fd693af8b74f6f151f2fd361c',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
				{
					auditor: slowMist,
					auditDate: '2024-12-17',
					variantsScope: { browser: true },
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/docs/Rabby%20Browser%20Extension%20Wallet%20-%20SlowMist%20Audit%20Report-20241217.pdf',
					codeSnapshot: {
						date: '2024-11-28',
						commit: '4e900e5944a671e99a135eea417bdfdb93072d99',
					},
					unpatchedFlaws: 'ALL_FIXED',
				},
			],
			lightClient: {
				ethereumL1: notSupported,
			},
		},
		privacy: {
			dataCollection: {
				browser: {
					onchain: {},
					collectedByEntities: [
						{
							// The code refers to this by `api.rabby.io`, but Rabby is wholly owned by DeBank.
							entity: deBank,
							leaks: {
								ipAddress: Leak.ALWAYS,
								walletAddress: Leak.ALWAYS,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
								mempoolTransactions: Leak.ALWAYS,
								cexAccount: Leak.NEVER, // There appears to be code to link to a Coinbase account but no way to reach it from the UI?
								ref: [
									{
										explanation: 'All wallet traffic goes through api.rabby.io without proxying.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/constant/index.ts#L468',
									},
									{
										explanation:
											'Rabby uses self-hosted Matomo Analytics to track user actions. While this tracking data does not contain wallet addresses, it goes to DeBank-owned servers much like Ethereum RPC requests do. This puts DeBank in a position to link user actions with wallet addresses through IP address correlation.',
										url: 'https://github.com/search?q=repo%3ARabbyHub%2FRabby%20matomoRequestEvent&type=code',
									},
									{
										explanation: 'Balance refresh requests are made about the active address only.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/background/controller/wallet.ts#L1622',
									},
								],
							},
						},
					],
				},
			},
			privacyPolicy: 'https://rabby.io/docs/privacy',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					arbitrum: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					opStack: TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		license: {
			browser: License.MIT,
			desktop: License.MIT,
			mobile: License.UNLICENSED_VISIBLE,
		},
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: false,
				donations: false,
				ecosystemGrants: false,
				publicOffering: false,
				ventureCapital: true,
				transparentConvenienceFees: true, // Swap fees
				hiddenConvenienceFees: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
			},
			ref: [
				{
					explanation: 'Rabby is owned by DeBank, which is funded by venture capital.',
					url: [
						{
							label: 'Series A',
							url: 'https://www.crunchbase.com/funding_round/debank-series-a--65945a04',
						},
						{
							label: 'Series B',
							url: 'https://www.crunchbase.com/funding_round/debank-series-b--44225a21',
						},
					],
				},
			],
		},
	},
	variants: {
		mobile: true,
		browser: true,
		desktop: true,
		embedded: false,
	},
}
