import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { notSupported, supported } from '@/schema/features/support'
import { nconsigny } from '../contributors/nconsigny'
import { WalletTypeCategory, SmartWalletStandard } from '@/schema/features/wallet-type'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'

export const elytro: Wallet = {
	metadata: {
		id: 'elytro',
		displayName: 'Elytro',
		tableName: 'Elytro',
		iconExtension: 'svg',
		blurb: paragraph(`
			We build Smart Contract Wallet for Ethereum.

If you want to report a security issue, please mail it to contact@elytro.com

You can find all the code for our open-source products.

For general information, visit elytro.com
		`),
		url: 'https://elytro.io',
		repoUrl: 'https://github.com/Elytro-eth',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		multiWalletType: {
			categories: [WalletTypeCategory.SMART_WALLET],
			smartWalletStandards: [SmartWalletStandard.ERC_4337]
		}
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: null,
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eoa: notSupported,
			mpc: notSupported,
			eip7702: notSupported,
			rawErc4337: supported({
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					url: 'https://github.com/Elytro-eth/soul-wallet-contract',
					explanation:
						'Elytro supports ERC-4337 smart contract wallets',
				},
			}),
		},
		multiAddress: null,
		addressResolution: {
			nonChainSpecificEnsResolution: null,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			ref: null,
		},
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
		},
		security: {
			passkeyVerification: {
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl: 'https://github.com/Elytro-eth/soul-wallet-contract/blob/a0146910dfbc46afeba809b26f256129d37e3301/contracts/libraries/WebAuthn.sol#L69',
				details: 'Elytro uses FreshCryptoLib for passkey verification in their WebAuthn library.',
				ref: [
					{
						url: 'https://github.com/Elytro-eth/soul-wallet-contract/blob/a0146910dfbc46afeba809b26f256129d37e3301/contracts/libraries/WebAuthn.sol#L69',
						explanation: 'Elytro implements P256 verification using FreshCryptoLib in their WebAuthn library.'
					}
				]
			},
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.NONE,
					details: 'No hardware wallet clear signing information available.'
				},
				ref: null,
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://github.com/Elytro-eth',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					arbitrum: null,
					opStack: null,
				},
			},
		},
		license: null,
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: null,
				donations: null,
				ecosystemGrants: null,
				publicOffering: null,
				ventureCapital: null,
				transparentConvenienceFees: null,
				hiddenConvenienceFees: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
			},
			ref: null,
		},
		transparency: {
			feeTransparency: null,
		},
	},
	variants: {
		mobile: true,
		browser: true,
		desktop: false,
		embedded: false,
		hardware: false,
	},
} 