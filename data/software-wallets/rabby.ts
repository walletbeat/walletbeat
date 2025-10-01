import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType } from '@/schema/features/account-support'
import {
	Leak,
	LeakedPersonalInfo,
	LeakedWalletInfo,
	MultiAddressPolicy,
	RegularEndpoint,
} from '@/schema/features/privacy/data-collection'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
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
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { cure53 } from '../entities/cure53'
import { deBank } from '../entities/debank'
import { leastAuthority } from '../entities/least-authority'
import { slowMist } from '../entities/slowmist'

export const rabby: SoftwareWallet = {
	metadata: {
		id: 'rabby',
		displayName: 'Rabby',
		tableName: 'Rabby',
		blurb: paragraph(`
			Rabby is a user-friendly Ethereum wallet focusing on smooth UX and security.
			It features an intuitive transaction preview feature and works on many chains.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2024-12-15',
		repoUrl: 'https://github.com/RabbyHub/Rabby',
		url: 'https://rabby.io',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupportedWithRef({
				ref: 'https://github.com/RabbyHub/Rabby/blob/fa9d0988e944f67e70da67d852cf3041d3b162da/src/background/controller/provider/controller.ts#L402-L407',
			}),
			eoa: supported({
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
		},
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
			ref: [
				{
					explanation:
						'Rabby supports resolving plain ENS addresses when importing watch addresses, but not when sending funds.',
					url: 'https://github.com/RabbyHub/Rabby/blob/5f2b84491b6af881ab4ef41f7627d5e068d10652/src/ui/views/ImportWatchAddress.tsx#L170',
				},
			],
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					feesLargerThan1bps: 'HIDDEN_BY_DEFAULT',
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
			},
		},
		chainConfigurability: {
			customChains: true,
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
		},
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
				ref: [
					{
						explanation:
							'Rabby implements the EIP-1193 Provider interface and injects it into web pages. EIP-2700 and EIP-6963 are also supported.',
						url: 'https://github.com/RabbyHub/Rabby/blob/develop/src/background/utils/buildinProvider.ts',
					},
				],
			},
			walletCall: notSupportedWithRef({
				ref: 'https://github.com/RabbyHub/Rabby/blob/fa9d0988e944f67e70da67d852cf3041d3b162da/src/background/controller/provider/controller.ts#L402-L407',
			}),
		},
		license: {
			license: License.MIT,
			ref: [
				{
					explanation: 'Rabby is licensed under the MIT license.',
					url: 'https://github.com/RabbyHub/Rabby/blob/develop/LICENSE',
				},
			],
		},
		monetization: {
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
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true, // Swap fees
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			dataCollection: {
				[Variant.BROWSER]: {
					collectedByEntities: [
						{
							// The code refers to this by `api.rabby.io`, but Rabby is wholly owned by DeBank.
							entity: deBank,
							leaks: {
								[LeakedPersonalInfo.CEX_ACCOUNT]: Leak.NEVER, // There appears to be code to link to a Coinbase account but no way to reach it from the UI?
								[LeakedPersonalInfo.IP_ADDRESS]: Leak.ALWAYS,
								[LeakedWalletInfo.MEMPOOL_TRANSACTIONS]: Leak.ALWAYS,
								[LeakedWalletInfo.WALLET_ACTIONS]: Leak.ALWAYS, // Matomo analytics
								[LeakedWalletInfo.WALLET_ADDRESS]: Leak.ALWAYS,
								[LeakedWalletInfo.WALLET_CONNECTED_DOMAINS]: Leak.ALWAYS, // Scam prevention dialog queries online service and sends domain name
								endpoint: RegularEndpoint,
								multiAddress: {
									type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
								},
								ref: [
									{
										explanation: 'All wallet traffic goes through api.rabby.io without proxying.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/constant/index.ts#L468',
									},
									{
										explanation:
											'Rabby uses self-hosted Matomo Analytics to track user actions within the wallet interface. While this tracking data does not contain wallet addresses, it goes to DeBank-owned servers much like Ethereum RPC requests do. This puts DeBank in a position to link user actions with wallet addresses through IP address correlation.',
										url: 'https://github.com/search?q=repo%3ARabbyHub%2FRabby%20matomoRequestEvent&type=code',
									},
									{
										explanation:
											'Rabby checks whether the domain you are connecting your wallet to is on a scam list. It sends the domain along with Ethereum address in non-proxied HTTP requests for API methods `getOriginIsScam`, `getOriginPopularityLevel`, `getRecommendChains`, and others.',
										label: 'Rabby API code on npmjs.com',
										url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
									},
									{
										explanation: 'Balance refresh requests are made about the active address only.',
										url: 'https://github.com/RabbyHub/Rabby/blob/356ed60957d61d508a89d71c63a33b7474d6b311/src/background/controller/wallet.ts#L1622',
									},
								],
							},
						},
					],
					onchain: {},
				},
				[Variant.DESKTOP]: null,
				[Variant.MOBILE]: null,
			},
			privacyPolicy: 'https://rabby.io/docs/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				[Variant.DESKTOP]: {
					ref: [
						{
							explanation:
								'Rabby Desktop supports Ledger, Trezor, OneKey, Keystone, AirGap Vault, CoolWallet, GridPlus, and NGRAVE ZERO hardware wallets. Note that this support is only available in the desktop version, not in the mobile or browser extension versions.',
							url: 'https://rabby.io/download',
						},
					],
					supportedWallets: {
						[HardwareWalletType.LEDGER]: supported({
							[HardwareWalletConnection.webUSB]: featureSupported,
						}),
						[HardwareWalletType.TREZOR]: supported({
							[HardwareWalletConnection.webUSB]: featureSupported,
						}),
						[HardwareWalletType.KEYSTONE]: supported({
							[HardwareWalletConnection.QR]: featureSupported,
						}),
						[HardwareWalletType.GRIDPLUS]: supported({
							[HardwareWalletConnection.webUSB]: featureSupported,
						}),
						[HardwareWalletType.OTHER]: supported({
							[HardwareWalletConnection.webUSB]: featureSupported,
						}),
					},
				},
				[Variant.BROWSER]: null,
				[Variant.MOBILE]: null,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			publicSecurityAudits: [
				{
					auditDate: '2021-06-18',
					auditor: slowMist,
					codeSnapshot: {
						date: '2021-06-23',
					},
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/Rabby%20chrome%20extension%20Penetration%20Testing%20Report.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2022-03-18',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'f6d19bd70664a7214677918e298619d583f9c3f1',
						date: '2022-01-26',
						tag: 'v0.21.1',
					},
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/SlowMist%20Audit%20Report%20-%20Rabby%20browser%20extension%20wallet-2022.03.18.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2023-07-20',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'f6221693b877b3c4eb1c7ac61146137eb1908997',
						date: '2023-06-19',
						tag: 'v0.91.0',
					},
					ref: 'https://github.com/RabbyHub/Rabby/blob/master/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet-2023.07.20.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2023-09-26',
					auditor: slowMist,
					codeSnapshot: {
						commit: '586447a46bcd0abab6356076e369357050c97796',
						date: '2023-09-01',
						tag: 'v0.33.0-prod',
					},
					ref: 'https://github.com/RabbyHub/RabbyDesktop/blob/publish/prod/docs/SlowMist%20Audit%20Report%20-%20Rabby%20Wallet%20Desktop.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.DESKTOP]: true },
				},
				{
					auditDate: '2024-10-18',
					auditor: leastAuthority,
					codeSnapshot: {
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
						date: '2024-09-08',
					},
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/Least%20Authority%20-%20Debank%20Rabby%20Walle%20Audit%20Report.pdf',
					unpatchedFlaws: [
						{
							name: 'Issue B: Insecure Key Derivation Function',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'Issue C: Weak Encryption Method Used',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'Issue D: Weak PBKDF2 Parameters Used',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
					],
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-10-22',
					auditor: cure53,
					codeSnapshot: {
						commit: 'a8dea5d8c530cb1acf9104a7854089256c36d85a',
						date: '2024-09-08',
					},
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/Cure53%20-%20Debank%20Rabby%20Wallet%20Audit%20Report.pdf',
					unpatchedFlaws: [
						{
							name: 'RBY-01-001 WP1-WP2: Mnemonic recoverable via process dump',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-002 WP1-WP2: Password recoverable via process dump',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-012 WP1-WP2: RabbitCode secret recoverable from installer files',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.HIGH,
						},
						{
							name: 'RBY-01-014 WP1-WP2: Backup password prompt bypassable',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
						{
							name: 'RBY-01-003 WP1-WP2: Lack of rate limiting for password unlock',
							presentStatus: 'NOT_FIXED',
							severityAtAuditPublication: SecurityFlawSeverity.MEDIUM,
						},
					],
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-10-23',
					auditor: slowMist,
					codeSnapshot: {
						commit: 'a424dbe54bba464da7585769140f6b7136c9108b',
						date: '2024-06-17',
					},
					ref: 'https://github.com/RabbyHub/rabby-mobile/blob/develop/docs/SlowMist%20Audit%20Report%20-%20Rabby%20mobile%20wallet%20iOS.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-12-12',
					auditor: leastAuthority,
					codeSnapshot: {
						commit: 'eb5da18727b38a3fd693af8b74f6f151f2fd361c',
						date: '2024-10-14',
					},
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/docs/Least%20Authority%20-%20DeBank%20Rabby%20Wallet%20Extension%20Final%20Audit%20Report-20241212.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					auditDate: '2024-12-17',
					auditor: slowMist,
					codeSnapshot: {
						commit: '4e900e5944a671e99a135eea417bdfdb93072d99',
						date: '2024-11-28',
					},
					ref: 'https://github.com/RabbyHub/Rabby/blob/develop/docs/Rabby%20Browser%20Extension%20Wallet%20-%20SlowMist%20Audit%20Report-20241217.pdf',
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
					ref: [
						{
							label: 'Rabby Security engine rule for contract recency',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/permit.ts#L42-L70',
						},
						{
							label: 'Rabby Security engine rule for contracts flagged as suspicious',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/tokenApprove.ts#L73-L92',
						},
						{
							explanation:
								'Rabby checks whether the contract you are visiting is on a scam list. It sends the contract along with Ethereum address in non-proxied HTTP requests for API method `unexpectedAddrList`.',
							label: 'Rabby API code on npmjs.com',
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
						},
					],
				}),
				scamUrlWarning: supported({
					leaksIp: true,
					leaksUserAddress: true,
					leaksVisitedUrl: 'DOMAIN_ONLY',
					ref: [
						{
							label: 'Rabby Security engine rule for scam dapp URL flagging',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/connect.ts#L5-L73',
						},
						{
							explanation:
								'Rabby checks whether the domain you are visiting is on a scam list. It sends the domain along with Ethereum address in non-proxied HTTP requests for API methods `getOriginIsScam`, `getOriginPopularityLevel`, `getRecommendChains`, and others.',
							label: 'Rabby API code on npmjs.com',
							url: 'https://www.npmjs.com/package/@rabby-wallet/rabby-api?activeTab=code',
						},
					],
				}),
				sendTransactionWarning: supported({
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: false,
					ref: [
						{
							label: 'Rabby Security engine rule for sending to unknown addresses',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L25-L44',
						},
						{
							label: 'Rabby Security engine rule for sending to whitelisted addresses',
							url: 'https://github.com/RabbyHub/rabby-security-engine/blob/5f6acd1a90eb0230176fadc7d0ae373cf8c21a73/src/rules/send.ts#L113-L132',
						},
					],
					userWhitelist: true,
				}),
			},
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
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
