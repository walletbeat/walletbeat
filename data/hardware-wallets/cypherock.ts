import { mattmatt } from '@/data/contributors/0xmattmatt'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	DataDisplayOptions,
	DataExtraction,
	noCalldataDecoding,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

import { keylabs } from '../entities/keylabs'

export const cypherockWallet: HardwareWallet = {
	metadata: {
		id: 'cypherock',
		displayName: 'Cypherock Wallet',
		tableName: 'Cypherock',
		blurb: paragraph(`
			The Cypherock has a secure element (EAL6+ rated) and uses a unique card-tapping system for transaction authorization.
		`),
		contributors: [patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'cypherock-x1',
				name: 'Cypherock X1',
				isFlagship: true,
				url: 'https://www.cypherock.com/product/cypherock-x1',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-06',
		urls: {
			docs: ['https://docs.cypherock.com/'],
			repositories: ['https://github.com/Cypherock'],
			socials: {
				facebook: 'https://facebook.com/cypherock/',
				instagram: 'https://www.instagram.com/cypherockwallet/',
				linkedin: 'https://www.linkedin.com/company/cypherockwallet/',
				telegram: 'https://t.me/cypherock',
				x: 'https://x.com/CypherockWallet',
			},
			websites: ['https://www.cypherock.com'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://www.youtube.com/watch?v=R0g35dKjRtI',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
			},
		}),
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation: 'Cypherock is open-source and reproducible',
						url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/main/LICENSE.md',
					},
				],
				license: FOSSLicense.MIT_WITH_CLAUSE,
			},
		},
		monetization: {
			ref: [
				{
					explanation: 'Hardware wallet startup Cypherock raises $1 Mn',
					url: 'https://entrackr.com/2022/12/hardware-wallet-startup-cypherock-raises-1-mn/',
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
			privacyPolicy: 'https://www.cypherock.com/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Cypherock has a 90-day disclosure policy, which means that we do our best to fix issues within 90 days upon receipt of a vulnerability report. If the issue is fixed sooner and if there is a mutual agreement between the security researcher and the Cypherock Security Team, the disclosure might happen before the 90-day deadline.',
						url: 'https://www.cypherock.com/bug-bounty',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2023-03-22' as CalendarDate,
				disclosure: supported({
					numberOfDays: 30,
				}),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Cypherock commits that security researchers reporting bugs will be protected from legal liability, so long as they follow responsible disclosure guidelines and principles.',
							url: 'https://www.cypherock.com/bug-bounty',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: true,
			}),
			firmware: {
				type: FirmwareType.PASS,
				customFirmware: null,
				firmwareOpenSource: FirmwareType.PASS,
				reproducibleBuilds: FirmwareType.PASS,
				silentUpdateProtection: FirmwareType.PASS,
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: [
				{
					ref: [
						{
							explanation: 'Cypherock X1 security audit by KeyLabs',
							url: 'https://www.cypherock.com/security-audit',
						},
						{
							explanation: 'Public Response to Keylabs Audit of Cypherock',
							url: 'https://www.cypherock.com/keylabs.pdf',
						},
					],
					auditDate: '2022-09-30',
					auditor: keylabs,
					codeSnapshot: {
						date: '2022-09-30',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
			],
			secureElement: supported({
				ref: [
					{
						explanation:
							'X1 Vault is open source and stores 1 of the 5 shards and the 4 X1 Cards have EAL 6+ secure elements and store the remaining 4 of the 5 shards.',
						url: 'https://docs.cypherock.com/security-overview/introduction',
					},
				],
				secureElementType: SecureElementType.EAL_6_PLUS,
			}),
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation: "Independent video demonstration of Cypherock's signing implementation.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=534',
					},
					{
						explanation:
							"Independent video demonstration of Cypherock's transaction implementation.",
						url: 'https://youtube.com/shorts/YG6lzwTUojE',
					},
				],

				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: false,
				},
				detailsDisplayed: {
					chain: DataDisplayOptions.NOT_IN_UI,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT, // derivation path counts
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT, // tx fee
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT, // contract address
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
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
