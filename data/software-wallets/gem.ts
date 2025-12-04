import { h3rman } from '@/data/contributors/0xh3rman'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { comprehensiveFeesShownByDefault } from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const gemwallet: SoftwareWallet = {
	metadata: {
		id: 'gemwallet',
		displayName: 'Gem Wallet',
		tableName: 'Gem Wallet',
		blurb: paragraph(`
			Gem Wallet is a fully open source multichain mobile wallet with transparent
			revenue reporting. Built for iOS and Android with a focus on security and
			user sovereignty.
		`),
		contributors: [h3rman],
		iconExtension: 'svg',
		lastUpdated: '2025-10-14',
		urls: {
			repositories: ['https://github.com/gemwalletcom/gem-ios'],
			websites: ['https://gemwallet.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: refTodo,
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
			safe: notSupported,
		},
		addressResolution: {
			ref: [
				{
					explanation:
						'Gem Wallet supports sending to ENS addresses, but users need to verify which chain they are using.',
					url: 'https://gemwallet.com',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Gem Wallet is licensed under the GPL-3.0 license.',
						url: 'https://github.com/gemwalletcom/gem-ios/blob/main/LICENSE',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Gem Wallet publishes transparent revenue data on Dune Analytics, showing all revenue sources and breakdowns.',
					url: 'https://dune.com/gemwallet/gem-wallet',
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
				transparentConvenienceFees: true,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://gemwallet.com/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: {
				ref: refNotNecessary,
				library: PasskeyVerificationLibrary.NONE,
			},
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet uses GoPlus and HashDit for security detection, providing malicious contract detection and transaction analysis.',
							url: 'https://gemwallet.com',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: false,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Gem Wallet warns users about outgoing transactions to unknown addresses.',
							url: 'https://gemwallet.com',
						},
					],
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
			},
		},
		selfSovereignty: {
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
			operationFees: {
				builtInErc20Swap: supported(comprehensiveFeesShownByDefault),
				erc20L1Transfer: supported(comprehensiveFeesShownByDefault),
				ethL1Transfer: supported(comprehensiveFeesShownByDefault),
				uniswapUSDCToEtherSwap: supported(comprehensiveFeesShownByDefault),
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
