import { nconsigny, patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import {
	CalldataDecoding,
	DataExtraction,
	displaysFullTransactionDetails,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const gridplusWallet: HardwareWallet = {
	metadata: {
		id: 'gridplus',
		displayName: 'GridPlus Wallet',
		tableName: 'GridPlus',
		blurb: paragraph(`
			GridPlus Wallet is a secure hardware wallet that combines secure key storage
			with convenient authentication methods.
		`),
		contributors: [nconsigny, patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'gridplus-lattice1',
				name: 'GridPlus Lattice1',
				isFlagship: true,
				url: 'https://gridplus.io/products/lattice1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://docs.gridplus.io/'],
			repositories: ['https://github.com/GridPlus'],
			socials: {
				discord: 'https://discord.com/invite/gridplus',
				linkedin: 'https://www.linkedin.com/company/gridplus/',
				x: 'https://x.com/gridplus/',
			},
			websites: ['https://gridplus.io/'],
		},
	},
	features: {
		accountSupport: null,
		licensing: null,
		monetization: {
			ref: [
				{
					explanation: 'Grid+ is the first internally incubated venture to spin out of ConsenSys.',
					url: 'https://medium.com/@mark_dago/grid-progress-report-12-15-2017-fdb4e24ed2ed',
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
			privacyPolicy: 'https://gridplus.io/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-09-23' as CalendarDate,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'GridPlus pledges not to initiate legal action for security research conducted pursuant to all Bug Bounty Program policies, including good faith, accidental violations.',
							url: 'https://docs.gridplus.io/resources/bug-bounty-and-responsible-disclosure-policy',
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
							"Independent video demonstration of GridPlus's clear signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=2079',
					},
					{
						explanation:
							"Independent video demonstration of GridPlus's transaction implementation on Safe.",
						url: 'https://youtube.com/shorts/_s5PjZhgBig',
					},
				],
				messageSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					details:
						'GridPlus Lattice1 provides message signing support, but does not show EIP-712 digests or hashes.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: {
						[CalldataDecoding.ETH_USDC_TRANSFER]: true,
						[CalldataDecoding.ZKSYNC_USDC_TRANSFER]: true,
						[CalldataDecoding.AAVE_SUPPLY]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_SUPPLY_NESTED]: true,
						[CalldataDecoding.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: false,
					},
					calldataExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'GridPlus Lattice1 provides clear transaction support, showing all transaction data, and even doing nested calldata decoding in some cases.',
					displayedTransactionDetails: displaysFullTransactionDetails,
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			secureElement: supported({
				ref: [
					{
						explanation:
							'The Lattice1 meets stringent security industry standards including FIPS, PCI, and EAL 6+ and is the only hardware wallet designed to safeguard against edge case risks such as attackers remotely accessing a users secrets via RF emissions.',
						url: 'https://www.prnewswire.com/news-releases/gridplus-sets-a-new-standard-for-blockchain-security-with-the-release-of-the-enterprise-grade-lattice1-wireless-hardware-wallet-301186849.html',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
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
