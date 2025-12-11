import { sigri } from '@/data/contributors/sigri'
import {mattmatt} from '@/data/contributors/0xmattmatt'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const mtpelerin: SoftwareWallet = {
	metadata: {
		id: 'mtpelerin',
		displayName: 'Bridge Wallet',
		tableName: 'Bridge Wallet',
		blurb: paragraph(
			'Buy, swap and sell crypto with the lowest fees, zero hidden costs and full control over your cryptoassets.',
		),
		contributors: [sigri, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-08-26',
		urls: {
			repositories: ['https://github.com/mtpelerin'],
			websites: ['https://www.mtpelerin.com/'],
		},
	},
	features: {
		/*accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			// BIP support is not verified
			eoa: supported({
				canExportPrivateKey: true,
				eip7702: notSupported,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
		},*/
		accountSupport: null,
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': null,
				'2700': null,
				'6963': null,
			},
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: refNotNecessary,
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: 'https://developers.mtpelerin.com/service-information/revenue-sharing',
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
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://www.mtpelerin.com/privacy-policy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'The bug bounty program is focused around its smart contracts, mobile apps and website, and is mostly aimed at addressing serious security issues directly affecting fund safety and user data protection.',
						url: 'https://immunefi.com/bug-bounty/mtpelerin/information/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-02-08' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.IMMUNEFI,
				rewards: supported({
					currency: 'USD',
					maximum: 100000,
					minimum: 1000,
				}),
				upgradePathAvailable: false,
			}),
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {},
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				ref: refNotNecessary,
				library: PasskeyVerificationLibrary.NONE,
			},
			publicSecurityAudits: null,
			scamAlerts: null,
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
