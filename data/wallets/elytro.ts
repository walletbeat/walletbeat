import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { notSupported, supported } from '@/schema/features/support'
import { nconsigny } from '../contributors/nconsigny'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { Variant } from '@/schema/variants'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'

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
					explanation: 'Elytro supports ERC-4337 smart contract wallets',
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
				libraryUrl:
					'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
				details: 'Elytro uses FreshCryptoLib for passkey verification in their WebAuthn library.',
				ref: [
					{
						url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/contracts/libraries/WebAuthn.sol',
						explanation:
							'Elytro implements P256 verification using openzeppelin p256 verifier in their WebAuthn library.',
					},
				],
			},
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {},
				ref: undefined,
			},
			hardwareWalletDappSigning: {
				level: DappSigningLevel.NONE,
				ref: undefined,
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
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			feeTransparency: null,
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
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
