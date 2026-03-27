import { ren2140 } from '@/data/contributors/ren2140'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { WalletProfile } from '@/schema/features/profile'
import { GuardianPolicyType, GuardianType } from '@/schema/features/security/account-recovery'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
} from '@/schema/features/security/bug-bounty-program'
import type {
	ContractTransactionWarning,
	ScamUrlWarning,
} from '@/schema/features/security/scam-alerts'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { comprehensiveFeesShownByDefault } from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

export const theBaseApp: SoftwareWallet = {
	metadata: {
		id: 'theBaseApp',
		displayName: 'Base',
		tableName: 'Base',
		blurb: paragraph(`
			Base is a secure onchain wallet and browser that puts you in
			control of your crypto, NFTs, DeFi activity, and digital assets.
		`),
		contributors: [ren2140],
		iconExtension: 'png',
		lastUpdated: '2026-03-19',
		urls: {
			docs: ['https://docs.base.org/get-started/base'],
			extensions: [],
			repositories: [
				'https://github.com/coinbase/smart-wallet',
				'https://github.com/base/account-sdk',
			],
			socials: {
				discord: 'https://discord.com/invite/buildonbase',
				farcaster: 'https://farcaster.xyz/base',
				x: 'https://x.com/base',
			},
			websites: ['https://wallet.coinbase.com/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.rawErc4337,
			eip7702: supported({
				ref: 'https://github.com/coinbase/smart-wallet',
				contract: {
					name: 'Coinbase Smart Wallet',
					address: '0x0000000000000000000000000000000000000000',
					eip7702Delegatable: true,
					methods: {
						isValidSignature: featureSupported,
						validateUserOp: featureSupported,
					},
					sourceCode: {
						ref: 'https://github.com/coinbase/smart-wallet',
						available: true,
					},
				},
			}),
			eoa: supported({
				ref: 'https://github.com/coinbase/smart-wallet',
				canExportPrivateKey: true,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: false,
					derivationPath: 'BIP44',
					seedPhrase: 'BIP39',
				},
			}),
			mpc: notSupported,
			rawErc4337: supported({
				ref: 'https://github.com/coinbase/smart-wallet',
				contract: {
					name: 'Coinbase Smart Wallet',
					address: '0x0000000000000000000000000000000000000000',
					eip7702Delegatable: false,
					methods: {
						isValidSignature: featureSupported,
						validateUserOp: featureSupported,
					},
					sourceCode: {
						ref: 'https://github.com/coinbase/smart-wallet',
						available: true,
					},
				},
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: notSupported,
		},
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: comprehensiveFeesShownByDefault,
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo,
				ether: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: supported({
					ref: refTodo,
					crossChainSumView: featureSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				}),
			},
		},
		chainConfigurability: notSupported,
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
			walletCall: null,
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: 'https://github.com/coinbase/smart-wallet?tab=MIT-1-ov-file#readme',
				license: FOSSLicense.MIT,
			},
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
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://wallet.coinbase.com/dapp-privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				guardianRecovery: supported({
					ref: refTodo,
					minimumGuardianPolicy: {
						type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
						descriptionMarkdown:
							'The Base App offers a recovery key on ERC-4337 accounts, allowing users to retain full access to their account if they lose access to their primary keys.',
						optionalGuardians: [
							{
								type: GuardianType.SELF_CUSTODY,
								description: 'Recovery key generated by the user',
							},
						],
						optionalGuardiansMinimumConfigurable: 1,
						optionalGuardiansMinimumNeededForRecovery: 1,
						requiredGuardians: [],
						secretReconstitution: 'CLIENT_SIDE',
					},
				}),
			},
			bugBountyProgram: supported({
				ref: 'https://hackerone.com/coinbase?type=team',
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE' as const,
				dateStarted: '2014-02-14' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.HACKER_ONE,
				rewards: supported({
					currency: 'USD',
					maximum: 1000000,
					minimum: 200,
				}),
				upgradePathAvailable: true,
			}),
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported<ContractTransactionWarning>({
					ref: refTodo,
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: refTodo,
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: notSupported,
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
