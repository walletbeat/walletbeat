import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { refNotNecessary, refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const trezorWallet: HardwareWallet = {
	metadata: {
		id: 'trezor',
		displayName: 'Trezor Wallet',
		tableName: 'Trezor',
		blurb: paragraph(`
			Trezor Wallet is a self-custodial hardware wallet built by SatoshiLabs. It
			provides secure storage for cryptocurrencies with an easy-to-use interface.
		`),
		contributors: [nconsigny, patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'trezor-safe-5',
				name: 'Trezor Safe 5',
				isFlagship: true,
				url: 'https://trezor.io/trezor-safe-5',
			},
			{
				id: 'trezor-safe-3',
				name: 'Trezor Safe 3',
				isFlagship: false,
				url: 'https://trezor.io/trezor-safe-3',
			},
			{
				id: 'trezor-model-one',
				name: 'Trezor Model One',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-one',
			},
			{
				id: 'trezor-model-t',
				name: 'Trezor Model T',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-t',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://trezor.io/learn'],
			repositories: ['https://github.com/trezor/trezor-suite'],
			socials: {
				instagram: 'https://www.instagram.com/trezor.io/',
				linkedin: 'https://www.linkedin.com/company/trezor/',
				reddit: 'https://www.reddit.com/r/TREZOR/',
				tiktok: 'https://www.tiktok.com/@trezor.io_official',
				x: 'https://x.com/trezor',
				youtube: 'https://www.youtube.com/@TrezorWallet',
			},
			websites: ['https://trezor.io/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://trezor.io/guides/third-party-wallet-apps/third-party-wallet-apps-dapps',
			supportedConnections: {
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.AMBIRE]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
			},
		}),
		licensing: null,
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: null,
		privacy: {
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://trezor.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2018-08-25' as CalendarDate,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation: 'Use exploits solely to verify the existence of vulnerabilities.',
							url: 'https://trezor.io/other/partner-portal/for-developers/bug-bounty-program',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: supported({
					currency: 'USD',
					maximum: 100000,
					minimum: 0,
				}),
				upgradePathAvailable: true,
			}),
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				ref: refNotNecessary,
				library: PasskeyVerificationLibrary.NONE,
			},
			publicSecurityAudits: null,
			secureElement: supported({
				ref: [
					{
						explanation:
							'Equipped with features including the Secure Element (EAL6+) and device-entry passphrase, it’s an impenetrable security pair.',
						url: 'https://trezor.io/trezor-safe-3?',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							"Independent video demonstration of Trezor's signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1108',
					},
					{
						explanation: 'Independent video showing transaction details on Trezor Safe 5',
						url: 'https://youtube.com/shorts/4LayLrSuHNg',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					...displaysFullTransactionDetails,
					chain: TransactionDisplayOptions.NOT_IN_UI,
					nonce: TransactionDisplayOptions.NOT_IN_UI,
				},
				legibility: noCalldataDecoding,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}

// Flagship : Trezor safe 5 : @https://trezor.io/trezor-safe-5
// Trezor safe 3 : @https://trezor.io/trezor-safe-3
// Trezor model one : @https://trezor.io/trezor-model-one
// Trezor model T / @https://trezor.io/trezor-model-t
