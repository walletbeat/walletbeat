import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { exampleContributor } from '../contributors/example'
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

const v1Audits: SecurityAudit[] = [
	{
		variantsScope: { [Variant.MOBILE]: true },
		// @TODO verify
		unpatchedFlaws: 'ALL_FIXED',
		auditor: certik,
		// @TODO verify
		auditDate: '2022-02-03',
		codeSnapshot: {
			// 	// @TODO verify
			date: '2023-11-08',
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Pashov-Ambire-third-security-review.md',
	},
]
const v2Audits: SecurityAudit[] = [
	{
		variantsScope: { [Variant.BROWSER]: true },
		// @TODO verify
		unpatchedFlaws: 'ALL_FIXED',
		auditor: pashov,
		// @TODO verify
		auditDate: '2024-04-01',
		codeSnapshot: {
			// 	// @TODO verify
			date: '2023-11-08',
			commit:
				'https://github.com/AmbireTech/ambire-common/tree/da3ba641a004d1f0143a20ddde48049b619431ad',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Pashov-Ambire-third-security-review.md',
	},
	{
		variantsScope: { [Variant.BROWSER]: true },
		// @TODO verify
		unpatchedFlaws: 'ALL_FIXED',
		auditor: hunterSecurity,
		// @TODO verify
		auditDate: '2025-02-20',
		codeSnapshot: {
			date: '2025-02-17',
			commit:
				'https://github.com/AmbireTech/ambire-common/commit/de88e26041db8777468f384e56d5ad0cb96e29a5',
		},
		ref: 'https://github.com/AmbireTech/ambire-common/blob/v2/audits/Ambire-EIP-7702-Update-Hunter-Security-Audit-Report-0.1.pdf',
	},
]
// @TODO formatting
export const ambire: Wallet = {
	metadata: {
		id: 'ambire',
		displayName: 'Ambire',
		tableName: 'Ambire',
		iconExtension: 'png',
		blurb: paragraph(`
			The first hybrid Account abstraction wallet to support Basic (EOA) and Smart accounts, 
			improving security and user experience.
			`),
		url: 'https://ambire.com',
		repoUrl: 'https://github.com/AmbireTech/extension',
		// @TODO
		contributors: [exampleContributor],
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
		},

		// @TODO go over everything again
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
			// @TODO finish and ref
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
			ref: null,
		},
		integration: {
			browser: {
				// @TODO verify
				'1193': notSupported,
				'2700': notSupported,
				'6963': featureSupported,
				ref: {
					url: 'https://github.com/AmbireTech/ambire-app/blob/v2/src/web/extension-services/background/background.ts',
				},
			},
		},
		security: {
			// @TODO
			scamAlerts: {
				/** Does the wallet warn the user when visiting a known-scam site? */
				scamUrlWarning: supported({
					leaksVisitedUrl: 'NO',
					leaksUserAddress: false,
					leaksIp: false,
				}),

				contractTransactionWarning: supported({
					// @TODO do we ?
					previousContractInteractionWarning: true,
					recentContractWarning: false,
					contractRegistry: false,
					leaksContractAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
				}),
				// @TODo are those really false?
				sendTransactionWarning: supported({
					// @TODO do we
					userWhitelist: true,
					newRecipientWarning: false,
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: true,
				}),
			},
			// @TODO add mobile and web audits
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
					// @TODO do we?
					level: ClearSigningLevel.FULL,
					// @TODO
					// details: 'No hardware wallet clear signing information available.',
				},
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
		},
		// @TODO
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
				// @TODO
				l2: {
					arbitrum: null,
					opStack: null,
				},
			},
		},
		license: { license: License.GPL_3_0 },
		// @TODO verify
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
		// @TODO look into the alg and set mobile to true
		[Variant.MOBILE]: false,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
