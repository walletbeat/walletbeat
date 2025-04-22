import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { AccountType } from '@/schema/features/account-support'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { lucemans } from '../contributors/lucemans'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'

export const zerion: Wallet = {
	metadata: {
		id: 'zerion',
		displayName: 'Zerion',
		tableName: 'Zerion',
		iconExtension: 'svg',
		blurb: paragraph(``),
		url: 'https://www.zerion.io',
		repoUrl: null,
		contributors: [lucemans],
		lastUpdated: '2025-04-22',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: null,
		accountSupport: {
			// BIP support is not verified
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
				},
				ref: [
					{
						url: ['https://www.ledger.com/zerion'],
						explanation: 'Ledger.com has a page dedicated to Zerion.',
					},
				],
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
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: false,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
