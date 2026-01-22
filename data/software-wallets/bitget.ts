import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramImplementation,
} from '@/schema/features/security/bug-bounty-program'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	DataDisplayOptions,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import { LicensingType, SourceNotAvailableLicense } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

import { mattmatt } from '../contributors/0xmattmatt'

export const bitget: SoftwareWallet = {
	metadata: {
		id: 'bitget',
		displayName: 'Bitget Wallet',
		tableName: 'Bitget',
		blurb: paragraph(`
			Bitget Wallet is a leading multi-chain decentralized wallet that is committed to providing a wide range of asset management and DeFi services for its users.
		`),
		contributors: [mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2026-01-17',
		urls: {
			docs: ['https://web3.bitget.com/en/docs'],
			extensions: [
				'https://chromewebstore.google.com/detail/bitget-wallet-crypto-web3/jiidiaalihmmhddjgbnbgdfflelocpak',
			],
			socials: {
				facebook: 'https://www.facebook.com/BitgetWallet/',
				linkedin: 'https://www.linkedin.com/company/bitgetwallet',
				x: 'https://x.com/BitgetWallet',
			},
			websites: ['https://web3.bitget.com/'],
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
				erc7828: null, // DONE
				erc7831: null, // DONE
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: refTodo,
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.AGGREGATED,
						byDefault: FeeDisplayLevel.AGGREGATED,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: refTodo,
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
				globalAccountValue: featureSupported,
				perChainAccountValue: notSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
			},
		},
		chainConfigurability: notSupported,
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: notSupported,
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
		multiAddress: featureSupported,
		privacy: {
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: null,
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				guardianRecovery: notSupported,
			},
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation: 'As from August 2025, this bug bounty program is no longer active.',
						url: 'https://blog.ambire.com/ambire-x-immunefy-bug-bounty-audit-our-code-and-earn-rewards/',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2021-12-17' as CalendarDate,
				disclosure: notSupported,
				legalProtections: notSupported,
				platform: BugBountyPlatform.BUGRAP,
				rewards: notSupported,
				upgradePathAvailable: false,
			}),
			hardwareWalletSupport: null,
			keysHandling: {
				ref: [
					{
						explanation:
							'Bitget Wallet Launches MPC Wallet, Providing a More Secure and User-Friendly Web3 Wallet Service',
						url: 'https://web3.bitget.com/en/blog/articles/bitget-wallet-launches-mpc-wallet',
					},
				],
				keyGeneration: KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
				multipartyKeyReconstruction:
					MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: notSupported,
				scamUrlWarning: notSupported,
				sendTransactionWarning: notSupported,
			},
			transactionLegibility: {
				ref: refTodo,
				calldataDisplay: {
					copyHexToClipboard: true,
					formatted: false,
					rawHex: true,
				},
				messageSigningLegibility: {
					[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.NOT_IN_UI,
					[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
					[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
					[MessageSigningDetails.SAFE_HASH]: DataDisplayOptions.NOT_IN_UI,
				},
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_BY_DEFAULT,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
			},
		},
		selfSovereignty: {
			transactionSubmission: null,
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
