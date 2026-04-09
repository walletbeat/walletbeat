import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { CanonicalWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import { iamkio } from '../contributors/iamkio'
import { kernal7702Contract } from '../wallet-contracts/kernal-7702'

export const pillarx = {
	metadata: {
		id: 'pillarx',
		displayName: 'PillarX',
		tableName: 'PillarX',
		blurb: paragraph(
			'PillarX is a web3 wallet that allows you to manage your digital assets and interact with the blockchain.',
		),
		contributors: [iamkio],
		iconExtension: 'svg',
		lastUpdated: '2025-12-16',
		urls: {
			websites: ['https://pillarx.app'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eip7702,
			eip7702: supported({
				ref: {
					explanation: 'PillarX supports EIP-7702',
					url: 'https://pillarx.app/login',
				},
				contract: kernal7702Contract,
			}),
			// BIP support is not verified
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: false,
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
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': notSupported,
				'2700': notSupported,
				'6963': notSupported,
			},
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'PillarX is licensed under the MIT license',
						url: 'https://github.com/pillarwallet/x/blob/main/LICENSE',
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: true,
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: notSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://pillarx.app/privacy-policy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: [Variant.MOBILE, Variant.BROWSER] satisfies NonEmptyArray<Variant>,
} satisfies CanonicalWallet
