import { patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { FirmwareType } from '@/schema/features/security/firmware'
import {
	DataExtraction,
	noCalldataDecoding,
	noDataExtraction,
} from '@/schema/features/security/hardware-wallet-app-signing'
import { SecureElementType } from '@/schema/features/security/secure-element'
import { notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
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
		contributors: [patrickalphac],
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
		repoUrl: 'https://github.com/Cypherock',
		url: 'https://www.cypherock.com',
	},
	features: {
		accountSupport: null,
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
			hardwareWalletAppSigning: {
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
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'Shows EIP-712 signature data only in the companion application, not on the hardware wallet itself.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: noDataExtraction,
					details:
						'Completely fails to display calldata for transactions on either the application or the hardware wallet itself.',
					displayedTransactionDetails: {
						chain: false,
						from: true, // derivation path counts
						gas: true, // tx fee
						nonce: false,
						to: true, // contract address
						value: true,
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
