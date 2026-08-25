import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { DataDisplayOptions } from '@/schema/features/security/transaction-legibility'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { kudelskiSecurity } from '../entities/kudelski-security'
import { leastAuthority } from '../entities/least-authority'
import { KeyGenerationLocation, MultiPartyKeyReconstruction } from '@/schema/features/security/keys-handling'

const securityAudits: SecurityAudit[] = [
	{
		ref: 'https://github.com/phantom/audit-reports/blob/3450f82bc6c633f5d2eceee9a979f98ac1ca3cb3/Kudelski-Security-2021.pdf',
		auditDate: '2021-05-07',
		auditor: kudelskiSecurity,
		unpatchedFlaws: 'ALL_FIXED',
		variantsScope: { [Variant.BROWSER]: true },
	},
	{
		ref: 'https://github.com/phantom/audit-reports/blob/3450f82bc6c633f5d2eceee9a979f98ac1ca3cb3/Least_Authority-2024.pdf',
		auditDate: '2024-06-07',
		auditor: leastAuthority,
		codeSnapshot: {
			commit: 'https://github.com/phantom/wallet/commit/aea4d38d3c4e9ebc7a02839c94e7b9fb381f1dbf',
			date: '2024-04-03' as const,
		},
		unpatchedFlaws: 'NONE_FOUND',
		variantsScope: 'ALL_VARIANTS',
	},
]

export const phantom: SoftwareWallet = {
	metadata: {
		id: 'phantom',
		displayName: 'Phantom',
		tableName: 'Phantom',
		coinspectId: 'phantom',
		contributors: [nconsigny, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-02-08',
		urls: {
			docs: ['https://docs.phantom.com/'],
			extensions: [
				'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
			],
			socials: {
				instagram: 'https://www.instagram.com/phantom/',
				linkedin: 'https://www.linkedin.com/company/phantomwallet/',
				reddit: 'https://www.reddit.com/r/Phantom/',
				x: 'https://x.com/phantom',
				youtube: 'https://www.youtube.com/@phantom-wallet',
			},
			websites: ['https://phantom.com'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: true,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: notSupported,
			safe: notSupported,
		},
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: refNotNecessary,
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
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
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://phantom.com/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: securityAudits,
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: null,
				erc8213: null,
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_OPTIONALLY,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_OPTIONALLY,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: notSupported,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
					[TransactionSubmissionL2Type.opStack]:  TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
