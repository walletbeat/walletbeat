import { gabrielkerekes } from '@/data/contributors/gabrielkerekes'
import { AccountType } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { metamask7702DelegatorContract } from '../wallet-contracts/metamask-7702-delegator'

export const nufi: SoftwareWallet = {
	metadata: {
		id: 'nufi',
		displayName: 'NuFi',
		tableName: 'NuFi',
		blurb: paragraph(`
			Powerful wallet for powerful users.
		`),
		contributors: [gabrielkerekes],
		iconExtension: 'svg',
		lastUpdated: '2025-08-11',
		repoUrl: 'https://github.com/nufi-official/nufi',
		url: 'https://nu.fi',
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				contract: metamask7702DelegatorContract,
			}),
			eoa: supported({
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
		},
		addressResolution: {
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
			ref: null,
		},
		chainAbstraction: null,
		chainConfigurability: {
			customChains: true,
			l1RpcEndpoint: RpcEndpointConfiguration.NO,
			otherRpcEndpoints: RpcEndpointConfiguration.NO,
		},
		ecosystem: {
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					nonDelegationTransactionDetailsIdenticalToNormalFlow: true,
				}),
				fee: {
					crossChainGas: notSupported,
					walletSponsored: notSupported,
				},
			},
		},
		integration: {
			browser: {
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
				ref: null,
			},
			walletCall: supported({
				atomicMultiTransactions: supported({
					ref: null,
				}),
			}),
		},
		license: {
			license: License.PROPRIETARY,
		},
		monetization: {
			ref: null,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: true,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://nu.fi/privacy-and-cookies-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: null,
				supportedWallets: {
					[HardwareWalletType.LEDGER]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
						[HardwareWalletConnection.bluetooth]: featureSupported,
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
					[HardwareWalletType.ONEKEY]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
					}),
					[HardwareWalletType.BITBOX]: supported({
						[HardwareWalletConnection.webUSB]: featureSupported,
					}),
				},
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
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
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
