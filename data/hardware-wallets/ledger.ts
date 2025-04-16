import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile, HardwareWalletManufactureType } from '@/schema/features/profile'
import { nconsigny } from '../contributors/nconsigny'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { featureSupported } from '@/schema/features/support'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'

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
					[HardwareWalletType.LEDGER]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletDappSigning: {
				level: DappSigningLevel.PARTIAL,
				details:
					'Ledger provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.',
				ref: [
					{
						url: 'https://youtu.be/7lP_0h-PPvY?t=720',
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
