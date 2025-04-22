import { AccountType } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import type { Wallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

import { lucemans } from '../contributors/lucemans'
import { nconsigny } from '../contributors/nconsigny'
import { polymutex } from '../contributors/polymutex'

export const frame: Wallet = {
	metadata: {
		id: 'frame',
		displayName: 'Frame',
		tableName: 'Frame',
		iconExtension: 'svg',
		blurb: paragraph(`
			Frame...
		`),
		url: 'https://frame.sh',
		repoUrl: null,
		contributors: [polymutex, nconsigny, lucemans],
		lastUpdated: '2025-03-13',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: {
			l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			customChains: true,
			ref: [
				{
					urls: [
						{
							url: 'https://docs.frame.sh/docs/Getting%20Started/Basics/Configuring%20Chains',
							label: 'Frame node connection documentation',
						},
					],
					explanation: 'Frame allows connecting to your own Ethereum node',
				},
			],
		},
		accountSupport: {
			eoa: supported({
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					seedPhrase: 'BIP39',
					derivationPath: 'BIP44',
					canExportSeedPhrase: true,
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			eip7702: notSupported,
			defaultAccountType: AccountType.eoa,
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
				supportedWallets: {
					[HardwareWalletType.LEDGER]: featureSupported,
					[HardwareWalletType.TREZOR]: featureSupported,
					[HardwareWalletType.KEYSTONE]: featureSupported,
					[HardwareWalletType.GRIDPLUS]: featureSupported,
					[HardwareWalletType.OTHER]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletDappSigning: {
				level: DappSigningLevel.NONE,
				details: 'No hardware wallet clear signing information available.',
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			bugBountyProgram: null,
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: null,
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
		[Variant.MOBILE]: false,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: true,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
