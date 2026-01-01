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
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const ledgerWallet: HardwareWallet = {
	metadata: {
		id: 'ledger',
		displayName: 'Ledger Wallet',
		tableName: 'Ledger',
		blurb: paragraph(`
			Ledger Wallet is a self-custodial wallet built by Ledger. It
			integrates with Ledger hardware wallets to provide secure cryptocurrency management.
		`),
		contributors: [nconsigny, patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'ledger-stax',
				name: 'Ledger Stax',
				isFlagship: true,
				url: 'https://shop.ledger.com/products/ledger-stax',
			},
			{
				id: 'ledger-nano-s',
				name: 'Ledger Nano S',
				isFlagship: false,
				url: 'https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device',
			},
			{
				id: 'ledger-nano-s-plus',
				name: 'Ledger Nano S+',
				isFlagship: false,
				url: 'https://shop.ledger.com/products/ledger-nano-s-plus',
			},
			{
				id: 'ledger-nano-x',
				name: 'Ledger Nano X',
				isFlagship: false,
				url: 'https://shop.ledger.com/products/ledger-nano-x',
			},
			{
				id: 'ledger-flex',
				name: 'Ledger Flex',
				isFlagship: false,
				url: 'https://shop.ledger.com/products/ledger-flex',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://developers.ledger.com/'],
			repositories: ['https://github.com/LedgerHQ/'],
			socials: {
				facebook: 'https://web.facebook.com/Ledger/',
				instagram: 'https://www.instagram.com/ledger/',
				linkedin: 'https://www.linkedin.com/company/ledgerhq/',
				reddit: 'https://www.reddit.com/r/ledgerwallet/',
				tiktok: 'https://www.tiktok.com/@ledger',
				x: 'https://x.com/Ledger',
			},
			websites: ['https://www.ledger.com/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://support.ledger.com/article/360018444599-zd',
			requiresManufacturerConsent: {
				type: 'FEATURES_GATED_BY_MANUFACTURER',
				ref: {
					explanation:
						"Software wallet developers are required to register with Ledger's partner program before their software wallet becomes able to display clear signing data on Ledger devices.",
					label: 'Ledger Developer Portal',
					url: 'https://developers.ledger.com/docs/clear-signing/for-wallets',
				},
			},
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
			},
		}),
		licensing: null,
		monetization: {
			ref: [
				{
					explanation:
						'Ledger raises $380 million to make digital assets more secure and accessible to everyone',
					url: 'https://www.ledger.com/ledger-raises-380-million-to-make-digital-assets-more-secure-and-accessible-to-everyone',
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
			privacyPolicy: 'https://ledger.com/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2020-03-07' as CalendarDate,
				disclosure: supported({
					numberOfDays: 90,
				}),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Ledger commits that security researchers reporting bugs will be protected from legal liability, so long as they follow responsible disclosure guidelines and principles.',
							url: 'https://donjon.ledger.com/bounty',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
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
						explanation:
							'Ledger devices have an EAL 5+ or an EAL 6+ certification depending on which device you get.',
						url: 'https://www.ledger.com/academy/security/the-secure-element-whistanding-security-attacks',
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
							"Independent video demonstration of Ledger's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1722',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: displaysFullTransactionDetails,
				legibility: noCalldataDecoding,
				messageSigningLegibility: null,
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

// add entries for

// For Ledger I need :

// Ledger nano S : @https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device
// Ledger nano S + :  @https://shop.ledger.com/products/ledger-nano-s-plus
// Ledger nano X : @https://shop.ledger.com/products/ledger-nano-x
// Ledger flex : @https://shop.ledger.com/products/ledger-flex
// flagship : Ledger stax : @https://shop.ledger.com/products/ledger-stax
