import { mattmatt } from '@/data/contributors/0xmattmatt'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

import { slowMist } from '../entities/slowmist'

export const onekeyWallet: HardwareWallet = {
	metadata: {
		id: 'onekey',
		displayName: 'OneKey Pro',
		tableName: 'OneKey Pro',
		blurb: paragraph(`
			OneKey Pro is a hardware wallet with excellent haptic feedback, air gap mode, and EAL6+ secure element.
		`),
		contributors: [patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'onekey-pro',
				name: 'OneKey Pro',
				isFlagship: true,
				url: 'https://onekey.so/products/onekey-pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-06',
		urls: {
			docs: ['https://developer.onekey.so/'],
			repositories: ['https://github.com/OneKeyHQ'],
			socials: {
				linkedin: 'https://www.linkedin.com/company/onekeyhq',
				x: 'https://x.com/OneKeyHQ',
			},
			websites: ['https://onekey.so/'],
		},
	},
	features: {
		accountSupport: null,
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'OneKey has mixed licensing (GPLv3/LGPLv3/MIT)',
						url: 'https://walletscrutiny.com/hardware/onekey.pro/',
					},
				],
				license: FOSSLicense.GPL_3_0,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'OneKey Secures Series B Funding at $150M Valuation, Led by YZi Labs',
					url: 'https://onekey.so/blog/updates/onekey-secures-series-b-funding/',
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
			privacyPolicy: 'https://help.onekey.so/hc/en-us/articles/360002003315-Privacy-Policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-04-20' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.BUGRAP,
				rewards: supported({
					ref: [
						{
							explanation:
								'At the discretion of OneKey, quality, creativity, or novelty of submissions may modify payouts within a given range.',
							url: 'https://bugrap.io/bounties/OneKey',
						},
					],
					currency: 'USDC',
					maximum: 10000,
					minimum: 100,
				}),
				upgradePathAvailable: false,
			}),
			firmware: {
				type: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				silentUpdateProtection: null,
			},
			hardwareWalletAppSigning: {
				ref: [
					{
						explanation:
							"Independent video demonstration of OneKey Pro's signing implementation with a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1958',
					},
					{
						explanation: "Independent video showing OneKey Pro's transaction details",
						url: 'https://youtube.com/shorts/J_XG7cNOVhM',
					},
				],
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'OneKey Pro shows EIP-712 domain types and message data but does not display domain hash or message hash for easier verification.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'OneKey Pro shows all calldata but does not decode it, requiring users to manually interpret the transaction data.',
					displayedTransactionDetails: {
						...displaysFullTransactionDetails,
						chain: false,
						nonce: false,
					},
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation: 'OneKey Pro security audit by SlowMist',
							url: 'https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20OneKey%20Pro_en-us.pdf',
						},
					],
					auditDate: '2024-10-21',
					auditor: slowMist,
					codeSnapshot: undefined,
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
			],
			secureElement: supported({
				ref: [
					{
						explanation:
							'Built with an EAL 6+ Secure Element, the same level of chip security used in government IDs, passports, and EMV bank cards.',
						url: 'https://onekey.so/products/onekey-classic-1s-hardware-wallet/',
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
