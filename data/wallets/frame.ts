import { Leak, MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import { deBank } from '../entities/debank'
import { polymutex } from '../contributors/polymutex'
import { nconsigny } from '../contributors/nconsigny'
import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { License } from '@/schema/features/license'
import { WalletProfile } from '@/schema/features/profile'
import { RpcEndpointConfiguration } from '@/schema/features/chain-configurability'
import { leastAuthority } from '../entities/least-authority'
import { slowMist } from '../entities/slowmist'
import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import { cure53 } from '../entities/cure53'
import { TransactionSubmissionL2Support } from '@/schema/features/self-sovereignty/transaction-submission'
import { AccountType } from '@/schema/features/account-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { WalletTypeCategory } from '@/schema/features/wallet-type'

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
		contributors: [polymutex, nconsigny],
		lastUpdated: '2025-03-13',
		multiWalletType: {
			categories: [WalletTypeCategory.EOA]
		}
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: null,
		accountSupport: null,
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
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.NONE,
					details: 'No hardware wallet clear signing information available.'
				},
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
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
		mobile: false,
		browser: true,
		desktop: true,
		embedded: false,
	},
}
