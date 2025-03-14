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
			Coming soon. We build secured and decentralized public infra for humanity on Ethereum. We believe in a free, open and self-own internet. We start by building a smart contract account.
		`),
		url: 'https://elytro.com',
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
				library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
				libraryUrl: 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
				details: 'Elytro uses FreshCryptoLib for passkey verification in their WebAuthn library.',
				ref: [
					{
						url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/contracts/libraries/WebAuthn.sol',
						explanation: 'Elytro implements P256 verification using openzeppelin p256 verifier in their WebAuthn library.'
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