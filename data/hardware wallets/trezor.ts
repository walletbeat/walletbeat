import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency'
import { trezor } from '../entities/trezor'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'

export const trezorWallet: Wallet = {
	metadata: {
		id: 'trezor',
		displayName: 'Trezor Wallet',
		tableName: 'Trezor',
		iconExtension: 'svg',
		blurb: paragraph(`
			Trezor Wallet is a self-custodial hardware wallet built by SatoshiLabs. It
			provides secure storage for cryptocurrencies with an easy-to-use interface.
		`),
		url: 'https://trezor.io/',
		repoUrl: 'https://github.com/trezor/trezor-suite',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
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
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.TREZOR]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.PARTIAL,
					details: 'Trezor provides partial clear signing support with most transaction details displayed on the device screen, but some complex transactions may not show all details.'
				},
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?si=07dMNswh_9RsuWQ9&t=879',
						explanation: 'Independent video demonstration of Trezor\'s clear signing implementation on Safe.',
					}
				],
			},
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
				details: 'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
				upgradePathAvailable: true,
				ref: [
					{
						url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
						explanation: 'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.'
					}
				]
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://trezor.io/privacy-policy',
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
