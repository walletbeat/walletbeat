import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { featureSupported } from '@/schema/features/support'
import { ledger } from '../entities/ledger'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

export const ledgerWallet: Wallet = {
	metadata: {
		id: 'ledger',
		displayName: 'Ledger Wallet',
		tableName: 'Ledger',
		iconExtension: 'svg',
		blurb: paragraph(`
			Ledger Wallet is a self-custodial wallet built by Ledger. It
			integrates with Ledger hardware wallets to provide secure cryptocurrency management.
		`),
		url: 'https://www.ledger.com/',
		repoUrl: 'https://github.com/LedgerHQ/',
		contributors: [nconsigny],
		lastUpdated: '2025-03-12',
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'ledger-stax',
				name: 'Ledger Stax',
				url: 'https://shop.ledger.com/products/ledger-stax',
				isFlagship: true,
			},
			{
				id: 'ledger-nano-s',
				name: 'Ledger Nano S',
				url: 'https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device',
				isFlagship: false,
			},
			{
				id: 'ledger-nano-s-plus',
				name: 'Ledger Nano S+',
				url: 'https://shop.ledger.com/products/ledger-nano-s-plus',
				isFlagship: false,
			},
			{
				id: 'ledger-nano-x',
				name: 'Ledger Nano X',
				url: 'https://shop.ledger.com/products/ledger-nano-x',
				isFlagship: false,
			},
			{
				id: 'ledger-flex',
				name: 'Ledger Flex',
				url: 'https://shop.ledger.com/products/ledger-flex',
				isFlagship: false,
			},
		],
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
					[HardwareWalletType.LEDGER]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				clearSigningSupport: {
					level: ClearSigningLevel.PARTIAL,
					details:
						'Ledger provides partial clear signing support with transaction details displayed on the device screen, but some complex transactions may not show all details.',
				},
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?si=KirhDV7xEQx9Npcl&t=720',
						explanation:
							"Independent video demonstration of Ledger's clear signing implementation on Safe.",
					},
				],
			},
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				url: 'https://donjon.ledger.com/bounty/',
				details:
					'Ledger offers a comprehensive bug bounty program through their Donjon security team. The program offers competitive rewards based on the severity of findings and has a clear disclosure process.',
				upgradePathAvailable: true,
				ref: [
					{
						url: 'https://donjon.ledger.com/bounty/',
						explanation:
							'Ledger maintains a well-documented bug bounty program through their Donjon security team, offering rewards up to $10,000 for critical vulnerabilities.',
					},
				],
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://ledger.com/privacy-policy',
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

// add entries for

// For Ledger I need :

// Ledger nano S : @https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device
// Ledger nano S + :  @https://shop.ledger.com/products/ledger-nano-s-plus
// Ledger nano X : @https://shop.ledger.com/products/ledger-nano-x
// Ledger flex : @https://shop.ledger.com/products/ledger-flex
// flagship : Ledger stax : @https://shop.ledger.com/products/ledger-stax
