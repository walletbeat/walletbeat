import { mattmatt } from '@/data/contributors/0xmattmatt'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import {
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
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	noCalldataDecoding,
	noDataExtraction,
	TransactionDisplayOptions,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const ngrave: HardwareWallet = {
	metadata: {
		id: 'ngrave',
		displayName: 'NGRAVE Zero',
		tableName: 'NGRAVE',
		blurb: paragraph(`
			NGRAVE Zero is a hardware wallet with EAL7+ secure element, biometric authentication, and QR code scanning capabilities. However, it fails to properly display transaction and message data for verification.
		`),
		contributors: [patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'ngrave-zero',
				name: 'NGRAVE Zero',
				isFlagship: true,
				url: 'https://ngrave.io/zero',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-07',
		urls: {
			socials: {
				discord: 'https://discord.com/invite/gapxmWEBNJ',
				facebook: 'https://web.facebook.com/ngrave.io/',
				instagram: 'https://www.instagram.com/ngrave.io/',
				linkedin: 'https://www.linkedin.com/company/ngrave/',
				x: 'https://x.com/ngrave_official',
			},
			websites: ['https://ngrave.io/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://support.ngrave.io/hc/en-us/articles/20045312764701-How-to-stay-safe-on-web3',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'NGRAVE is not open source',
						url: 'https://youtu.be/-m1jcBFS0dc?t=701',
					},
				],
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Crypto hardware wallet NGRAVE raises $6M seed round',
					url: 'https://ngrave.io/en/crypto-hardware-wallet-ngrave-raises-6m-seed-round',
				},
			],
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
				ventureCapital: true,
			},
		},
		multiAddress: null,
		privacy: {
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://ngrave.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2025-01-18' as CalendarDate,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'We ensure that security researchers who follow our guidelines are protected from legal action and are acknowledged for their contributions.',
							url: 'https://ngrave.io/en/bug-bounty-program',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: supported({
				ref: [
					{
						explanation: 'The only crypto hardware wallet that achieved EAL7 certification.',
						url: 'https://ngrave.io/en/zero',
					},
				],
				secureElementType: SecureElementType.EAL_7,
			}),
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation: 'Independent video demonstration of NGRAVE Zero signing issues',
						url: 'https://youtu.be/-m1jcBFS0dc?t=701',
					},
				],
				dataExtraction: noDataExtraction,
				detailsDisplayed: {
					chain: TransactionDisplayOptions.NOT_IN_UI,
					from: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					gas: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: TransactionDisplayOptions.NOT_IN_UI,
					to: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
					value: TransactionDisplayOptions.SHOWN_BY_DEFAULT,
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
