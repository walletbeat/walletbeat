import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { keystone } from '../entities/keystone'

export const keystoneWallet: Wallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone',
		tableName: 'Keystone',
		iconExtension: 'svg',
		blurb: paragraph(`
			Keystone is an air-gapped hardware wallet that uses QR codes for communication.
			It offers enhanced security by keeping private keys completely offline.
		`),
		url: 'https://keyst.one/',
		repoUrl: 'https://github.com/KeystoneHQ',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
	},
	features: {
		profile: WalletProfile.HARDWARE,
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
			passkeyVerification: null,	
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.KEYSTONE]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.FULL,
					details: 'Keystone provides full clear signing support with detailed transaction information displayed on device screen. This was verified through independent reviews showing its robust hardware wallet security features.'
				},
				ref: [
					{
						url: 'https://x.com/ml_sudo/status/1899560303370944598',
						explanation: 'Independent verification of Keystone\'s strong security features and clear signing capabilities.',
					},
					{
						url: 'https://youtu.be/7lP_0h-PPvY?si=S4wNFukrmg4rwyFA&t=1141',
						explanation: 'Video demonstration of Keystone\'s clear signing implementation on Safe.',
					}
				],
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://keyst.one/privacy-policy',
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
		browser: false,
		desktop: false,
		embedded: false,
		hardware: true,
	},
}
