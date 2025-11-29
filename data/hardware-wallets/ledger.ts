import { nconsigny, patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { notSupported, supported } from '@/schema/features/support'
import { refNotNecessary, refTodo } from '@/schema/reference'
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
		contributors: [nconsigny, patrickalphac],
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
		repoUrl: 'https://github.com/LedgerHQ/',
		url: 'https://www.ledger.com/',
	},
	features: {
		accountSupport: null,
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
			hardwareWalletAppSigning: {
				ref: [
					{
						explanation:
							"Independent video demonstration of Ledger's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1722',
					},
				],
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'Ledger provides basic message signing details when using hardware wallets, and complex signatures can be verified by comparing the EIP-712 hashes to their expected outcomes.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: true, // Fantastic
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: {
						[DataExtraction.EYES]: true, // VERY hard to verify, very weird format
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'Ledger provides basic message signing details when using hardware wallets, but complex interactions are very difficult to verify on the device.',
					displayedTransactionDetails: displaysFullTransactionDetails,
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				ref: refNotNecessary,
				library: PasskeyVerificationLibrary.NONE,
			},
			publicSecurityAudits: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
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
