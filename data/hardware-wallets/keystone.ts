import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import type { HardwareWallet } from '@/data/hardware-wallets'
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
import { FirmwareType } from '@/schema/features/security/firmware'
import { SecureElementType } from '@/schema/features/security/secure-element'
import {
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataExtraction,
	DataLocation,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'

import { keylabs } from '../entities/keylabs'
import { slowMist } from '../entities/slowmist'

export const keystoneWallet: HardwareWallet = {
	metadata: {
		id: 'keystone',
		displayName: 'Keystone Wallet',
		tableName: 'Keystone',
		blurb: paragraph(`
			Keystone Wallet is a self-custodial hardware wallet that provides secure private
			key storage. It uses QR codes for air-gapped transaction signing.
		`),
		contributors: [nconsigny, patrickalphac, mattmatt],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'keystone-pro',
				name: 'Keystone Pro',
				isFlagship: true,
				url: 'https://keyst.one/pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://support.keyst.one/'],
			repositories: ['https://github.com/KeystoneHQ'],
			socials: {
				facebook: 'https://web.facebook.com/people/Keystone-Wallet/',
				farcaster: 'https://farcaster.xyz/keystonewallet',
				reddit: 'https://www.reddit.com/r/KeystoneWallet/',
				telegram: 'https://t.me/KeystoneWallet',
				x: 'https://x.com/KeystoneWallet',
				youtube: 'https://www.youtube.com/channel/UCaReIdawwYPPcyWGoNunF7g',
			},
			websites: ['https://keyst.one/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: 'https://guide.keyst.one/docs/keystone',
			requiresManufacturerConsent: null,
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
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
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://keyst.one/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: refTodo,
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-04-02' as const,
				disclosure: notSupported,
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Keystone strongly supports security research into our products and wants to encourage that research.',
							url: 'https://keyst.one/bug-bounty-program',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			duressResistance: null,
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
							explanation: 'Keystone 3 Pro security audit by Keylabs',
							url: 'https://github.com/keylabsio/audits/blob/24e10a7404106494f66c5ebcf49b8fa4eaaa2d3c/2023-11-keystone3.pdf',
						},
					],
					auditDate: '2023-11-22',
					auditor: keylabs,
					codeSnapshot: undefined,
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: { [Variant.HARDWARE]: true },
				},
				{
					ref: [
						{
							explanation: 'Keystone 3 Pro security audit by SlowMist',
							url: 'https://github.com/slowmist/Knowledge-Base/blob/bbf894fc9c42d1e9af7b2690f54fc94c7d0fc299/open-report-V2/blockchain-application/SlowMist%20Audit%20Report%20-%20Keystone3_en-us.pdf',
						},
					],
					auditDate: '2023-09-07',
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
							'Keystone 3 incorporates a PCI-grade anti-tampering feature, with an intricate ‘security house’ of circuitry encompassing the core IC and SE chips.',
						url: 'https://blog.keyst.one/secure-elements-the-bedrock-of-hardware-wallet-security-1dd8cbdef461',
					},
				],
				secureElementType: SecureElementType.PCI,
			}),
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							"Independent video demonstration of Keystone's signing implementation on a Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=759',
					},
					{
						explanation:
							"Independent video demonstration of Keystone's transaction implementation on a Safe.",
						url: 'https://youtube.com/shorts/Ly9lo4g5NpA',
					},
				],
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.HASHES]: false,
					[DataExtraction.QRCODE]: true,
				},
				detailsDisplayed: {
					...displaysFullTransactionDetails,
					nonce: DataDisplayOptions.NOT_IN_UI,
				},
				erc7730: supported({
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataLocation.NOT_PROVIDED,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataLocation.NOT_PROVIDED,
				}),
				erc8213: null,
			},
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
