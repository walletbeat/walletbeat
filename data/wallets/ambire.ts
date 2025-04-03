import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { Variant } from '@/schema/variants'
import { RpcEndpointConfiguration } from '@/schema/features/chain-configurability'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { License } from '@/schema/features/license'
import { pashov } from '../entities/pashov-audit-group'
import { hunterSecurity } from '../entities/hunter-security'
import { SmartWalletStandard, WalletTypeCategory } from '@/schema/features/wallet-type'
import type { SecurityAudit } from '@/schema/features/security/security-audits'
import { certik } from '../entities/certik'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { jiojosbg } from '../contributors/jiojosbg'

const v1Audits: SecurityAudit[] = [
	{
		variantsScope: { [Variant.MOBILE]: true },
		unpatchedFlaws: 'ALL_FIXED',
		auditor: certik,
		auditDate: '2022-02-03',
		codeSnapshot: {
			date: '2022-01-10',
			commit:
				'https://github.com/AmbireTech/wallet/commit/09c5da5f5b5572092289b3c1cf8371b62ad87cee',
		},
		ref: 'https://github.com/AmbireTech/wallet/blob/main/contracts/audits/Certik.pdf',
	},
]
const v2Audits: SecurityAudit[] = [
	{
		variantsScope: { [Variant.BROWSER]: true },
		unpatchedFlaws: 'ALL_FIXED',
		auditor: pashov,
		auditDate: '2024-01-26',
		codeSnapshot: {
			date: '2023-11-08',
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Pashov-Ambire-third-security-review.md',
	},
	{
		variantsScope: { [Variant.BROWSER]: true },
		unpatchedFlaws: 'NONE_FOUND',
		auditor: hunterSecurity,
		auditDate: '2025-02-20',
		codeSnapshot: {
			date: '2025-02-17',
			commit:
				'https://github.com/AmbireTech/ambire-common/commit/de88e26041db8777468f384e56d5ad0cb96e29a5',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
	},
]
export const ambire: Wallet = {
	metadata: {
		id: 'ambire',
		displayName: 'Ambire',
		tableName: 'Ambire',
		iconExtension: 'svg',
		blurb: paragraph(`
			The first hybrid Account abstraction wallet to support Basic (EOA) and Smart accounts, 
			improving security and user experience.
			`),
		url: 'https://ambire.com',
		repoUrl: 'https://github.com/AmbireTech/extension',
		contributors: [jiojosbg],
		lastUpdated: '2025-03-20',
		multiWalletType: {
			categories: [WalletTypeCategory.EOA, WalletTypeCategory.SMART_WALLET],
			smartWalletStandards: [SmartWalletStandard.ERC_4337, SmartWalletStandard.ERC_7702],
		},
	},
	features: {
		profile: WalletProfile.BROWSER_EXTENSION,
		chainConfigurability: {
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			customChains: true,
			ref: {
				url: 'https://github.com/AmbireTech/ambire-common/blob/v2/src/consts/networks.ts',
				label: 'List of RPCs we use for default chains',
				explanation: "Ambire executes generic RPC requests to get user's balance and ENS.",
			},
		},

		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eoa: supported({
				canExportPrivateKey: true,
				canExportSeedPhrase: true,
				keyDerivation: {
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
					type: 'BIP32',
					canExportSeedPhrase: true,
				},
			}),
			eip7702: supported({
				contractCode: {
					keyRotationTransactionGeneration: TransactionGenerationCapability.IMPOSSIBLE,
					controllingSharesInSelfCustodyByDefault: 'YES',
					tokenTransferTransactionGeneration:
						TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
					ref: {
						url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount7702.sol',
						explanation: 'Ambire supports EIP-7702 smart contract wallets',
					},
				},
			}),
			mpc: notSupported,
			rawErc4337: supported({
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					url: 'https://github.com/AmbireTech/ambire-common/blob/v2/contracts/AmbireAccount.sol',
					explanation: 'Ambire supports ERC-4337 smart contract wallets',
				},
			}),
		},

		multiAddress: featureSupported,
		addressResolution: {
			nonChainSpecificEnsResolution: supported({
				medium: 'CHAIN_CLIENT',
			}),
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
		},
		integration: {
			browser: {
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
				ref: {
					url: 'https://github.com/AmbireTech/extension/blob/v2/src/web/extension-services/background/background.ts',
				},
			},
		},
		security: {
			scamAlerts: {
				scamUrlWarning: supported({
					leaksVisitedUrl: 'NO',
					leaksUserAddress: false,
					leaksIp: false,
					ref: {
						urls: [
							{
								url: 'https://github.com/AmbireTech/ambire-common/blob/v2/src/controllers/phishing/phishing.ts',
								label: 'Implementation',
							},
						],
						explanation:
							"Ambire first fetches a list of publicly available known scam URLs from an external API. Then, it checks if the website you're visiting is on that list. If it is, a warning is displayed.",
						lastRetrieved: '2025-04-02',
					},
				}),
				contractTransactionWarning: notSupported,
				sendTransactionWarning: supported({
					userWhitelist: true,
					newRecipientWarning: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					ref: {
						url: {
							url: 'https://github.com/AmbireTech/ambire-common/blob/v2/src/libs/portfolio/getOnchainBalances.ts',
							label: 'Part of the implementation for balance change detection',
						},
						explanation:
							'Ambire uses generic JSON RPC methods methods to detect significant balance changes without relying on third party services (other than standard JSON RPC-s and internal services). By Default all provider requests for default chains are handled via an Ambire proxy service that prevents the leaking of user IPs.',
					},
				}),
			},
			publicSecurityAudits: [...v2Audits, ...v1Audits],
			lightClient: {
				ethereumL1: notSupported,
			},
			hardwareWalletSupport: {
				[Variant.BROWSER]: {
					supportedWallets: {
						[HardwareWalletType.LEDGER]: featureSupported,
						[HardwareWalletType.GRIDPLUS]: featureSupported,
						[HardwareWalletType.TREZOR]: featureSupported,
						[HardwareWalletType.FIREFLY]: notSupported,
						[HardwareWalletType.KEEPKEY]: notSupported,
						[HardwareWalletType.KEYSTONE]: notSupported,
					},
					ref: [
						{
							url: 'https://www.ambire.com/',
						},
					],
				},
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.FULL,
				},
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://www.ambire.com/Ambire%20ToS%20and%20PP%20(26%20November%202021).pdf',
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
			license: License.GPL_3_0,
			ref: 'https://github.com/AmbireTech/extension/blob/main/LICENSE',
		},
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: true,
				donations: false,
				ecosystemGrants: true,
				publicOffering: false,
				ventureCapital: true,
				transparentConvenienceFees: false,
				hiddenConvenienceFees: true,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
			},
			ref: null,
		},
		transparency: {
			feeTransparency: {
				level: FeeTransparencyLevel.DETAILED,
				disclosesWalletFees: true,
				showsTransactionPurpose: true,
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
