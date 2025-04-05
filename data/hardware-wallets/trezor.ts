import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

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
		hardwareWalletModels: [
			{
				id: 'trezor-safe-5',
				name: 'Trezor Safe 5',
				url: 'https://trezor.io/trezor-safe-5',
				isFlagship: true,
			},
			{
				id: 'trezor-safe-3',
				name: 'Trezor Safe 3',
				url: 'https://trezor.io/trezor-safe-3',
				isFlagship: false,
			},
			{
				id: 'trezor-model-one',
				name: 'Trezor Model One',
				url: 'https://trezor.io/trezor-model-one',
				isFlagship: false,
			},
			{
				id: 'trezor-model-t',
				name: 'Trezor Model T',
				url: 'https://trezor.io/trezor-model-t',
				isFlagship: false,
			},
		],
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
					details:
						'Trezor provides partial clear signing support with most transaction details displayed on the device screen, but some complex transactions may not show all details.',
				},
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?si=07dMNswh_9RsuWQ9&t=879',
						explanation:
							"Independent video demonstration of Trezor's clear signing implementation on Safe.",
					},
				],
			},
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
				details:
					'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
				upgradePathAvailable: true,
				ref: [
					{
						url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
						explanation:
							'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
					},
				],
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
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
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

// Flagship : Trezor safe 5 : @https://trezor.io/trezor-safe-5
// Trezor safe 3 : @https://trezor.io/trezor-safe-3
// Trezor model one : @https://trezor.io/trezor-model-one
// Trezor model T / @https://trezor.io/trezor-model-t
