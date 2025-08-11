import { gabrielkerekes } from '@/data/contributors/gabrielkerekes'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
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
				ref: {
					explanation:
						'The NuFi FAQ mentions the use the MetaMask DeleGator contract as smart account implementation.',
					label: 'NuFi support site',
					url: 'https://support.nu.fi/support/solutions/articles/80001178239',
				},
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
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
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
			},
			walletCall: supported({
				atomicMultiTransactions: featureSupported,
			}),
		},
		license: {
			license: License.PROPRIETARY,
		},
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: false,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://nu.fi/privacy-and-cookies-policy',
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
				ethereumL1: notSupported,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
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
