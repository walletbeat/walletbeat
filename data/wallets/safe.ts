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

export const safe: Wallet = {
	metadata: {
		id: 'safe',
		displayName: 'Safe',
		tableName: 'Safe',
		iconExtension: 'svg',
		blurb: paragraph(`
			Safe (formerly Gnosis Safe) is a smart contract wallet focused on secure asset management
			with multi-signature functionality for individuals and organizations.
		`),
		url: 'https://safe.global',
		repoUrl: 'https://github.com/safe-global',
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
			rawErc4337: supported({
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				ref: {
					url: 'https://github.com/safe-global/safe-modules/tree/master/4337',
					explanation: 'Safe supports ERC-4337 via their 4337 module implementation',
				},
			}),
			eip7702: notSupported,
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
			passkeyVerification: {
				library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
				libraryUrl:
					'https://github.com/safe-global/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
				details: 'Safe uses FreshCryptoLib for passkey verification in their 4337 modules.',
				ref: [
					{
						url: 'https://github.com/safe-global/safe-modules/tree/main/modules/passkey/contracts/vendor/FCL',
					},
					{
						url: 'https://github.com/safe-global/safe-modules/blob/main/modules/passkey/contracts/verifiers/FCLP256Verifier.sol',
						explanation: 'Safe uses FCL P256 verifier for passkey verification.',
					},
				],
			},
			bugBountyProgram: null,
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://safe.global/privacy',
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
