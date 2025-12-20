import { nconsigny } from '@/data/contributors/nconsigny'
import { polymutex } from '@/data/contributors/polymutex'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import { GuardianPolicyType, GuardianType } from '@/schema/features/security/account-recovery'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import type { ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import { displaysFullCallData } from '@/schema/features/security/transaction-legibility'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '@/schema/features/self-sovereignty/chain-configurability'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import {
	comprehensiveFeesShownByDefault,
	FeeDisplayLevel,
} from '@/schema/features/transparency/fee-display'
import {
	FOSSLicense,
	LicensingType,
	SourceAvailableNonFOSSLicense,
} from '@/schema/features/transparency/license'
import { refTodo, type WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { SoftwareWallet } from '@/schema/wallet'
import { mdParagraph, paragraph } from '@/types/content'

import { alphabet } from '../entities/alphabet'
import { apple } from '../entities/apple'
import { consensys } from '../entities/consensys'
import { cure53 } from '../entities/cure53'
import { cyfrin } from '../entities/cyfrin'
import { diligence } from '../entities/diligence'
import { metamask7702DelegatorContract } from '../wallet-contracts/metamask-7702-delegator'

export const metamask: SoftwareWallet = {
	metadata: {
		id: 'metamask',
		displayName: 'MetaMask',
		tableName: 'MetaMask',
		blurb: paragraph(`
			MetaMask is a popular multichain wallet created by Consensys and that has
			been around for a long time. It is a jack-of-all-trades wallet that can
			be extended through MetaMask Snaps.
		`),
		contributors: [polymutex, nconsigny],
		iconExtension: 'svg',
		lastUpdated: '2025-10-13',
		urls: {
			docs: ['https://docs.metamask.io/'],
			extensions: [
				'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
			],
			repositories: ['https://github.com/MetaMask/metamask-extension'],
			socials: {
				farcaster: 'https://farcaster.xyz/metamask',
				linkedin: 'https://www.linkedin.com/company/metamask/',
				reddit: 'https://www.reddit.com/r/Metamask/',
				tiktok: 'https://www.tiktok.com/@metamask',
				x: 'https://x.com/MetaMask',
			},
			websites: ['https://metamask.io'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				ref: refTodo,
				contract: metamask7702DelegatorContract,
			}),
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
			ref: [
				{
					explanation: 'MetaMask supports ENS domain resolution.',
					url: 'https://support.metamask.io/more-web3/learn/sending-or-receiving-a-transaction-with-ens/',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: supported({
					ref: {
						explanation:
							'MetaMask has a built-in bridge feature that allows users to bridge assets between chains.',
						url: 'https://support.metamask.io/more-web3/learn/field-guide-to-bridges/',
					},
					feesLargerThan1bps: {
						afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
						byDefault: FeeDisplayLevel.COMPREHENSIVE,
						fullySponsored: false,
					},
					risksExplained: 'NOT_IN_UI',
				}),
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: {
					explanation:
						'MetaMask displays tokens across multiple networks in a single aggregated view with estimated portfolio value',
					url: 'https://support.metamask.io/manage-crypto/tokens/how-to-view-your-token-balance-across-multiple-networks/',
				},
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
				// MetaMask supports aggregated balance across popular networks, but custom networks are not included
				globalAccountValue: featureSupported,
				perChainAccountValue: featureSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: featureSupported,
				},
			},
		},
		chainConfigurability: supported<WithRef<ChainConfigurability>>({
			ref: [
				{
					explanation: `
						MetaMask allows users to configure custom RPC endpoints for any
						network, including Ethereum mainnet, though it contacts the
						default \`mainnet.infura.io\` and some L2s (e.g
						\`polygon-mainnet.infura.io\`, \`arbitrum-mainnet.infura.io\`) to
						perform non-sensitive RPCs (\`eth_blockNumber\` and \`net_version\`)
						before the user is able to customize the endpoints to use for
						these chains.
					`,
					url: 'https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc/',
				},
			],
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: notSupported, // Token import dialog is broken in this case
					erc20TokenSend: notSupported, // Can't add token.
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST,
			}),
		}),
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: [
					{
						explanation:
							'MetaMask browser extension supports standard Ethereum Provider APIs. Mobile app does not inject into web pages.',
						url: 'https://support.metamask.io/hc/en-us/articles/360015489471',
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
			walletCall: supported({
				ref: refTodo,
				atomicMultiTransactions: featureSupported,
			}),
		},
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: {
					explanation:
						'The MetaMask core repository contains various packages reused across all MetaMask versions, licensed under MIT.',
					url: 'https://github.com/MetaMask/core/tree/main/packages',
				},
				license: FOSSLicense.MIT,
			},
			walletAppLicense: {
				[Variant.BROWSER]: {
					ref: {
						explanation:
							'The MetaMask browser extension uses a proprietary source-available license.',
						url: 'https://github.com/MetaMask/metamask-extension/blob/main/LICENSE',
					},
					license: SourceAvailableNonFOSSLicense.PROPRIETARY_SOURCE_AVAILABLE,
				},
				[Variant.MOBILE]: {
					ref: {
						explanation: 'The MetaMask mobile app uses a proprietary source-available license.',
						url: 'https://github.com/MetaMask/metamask-mobile/blob/main/LICENSE',
					},
					license: SourceAvailableNonFOSSLicense.PROPRIETARY_SOURCE_AVAILABLE,
				},
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'MetaMask is funded through transparent swap fees and venture capital with publicly disclosed funding rounds.',
					url: 'https://consensys.io/blog/consensys-raises-450m-series-d-funding',
				},
			],
			revenueBreakdownIsPublic: true,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: false,
				transparentConvenienceFees: true,
				ventureCapital: true,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://consensys.io/privacy-notice/',
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
				guardianRecovery: supported({
					ref: [
						{
							label: 'MetaMask account recovery documentation',
							url: 'https://support.metamask.io/configure/wallet/social-login',
						},
					],
					minimumGuardianPolicy: {
						type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
						descriptionMarkdown: `
							MetaMask's account recovery feature splits recovery key shares across Google
							and/or Apple. The user may configure a single one without the other,
							in which case the key is effectively a 1-of-1.

							MetaMask uses a key derived from the wallet password and these key shares
							to create an encrypted seed phrase backup stored in Consensys's data store service.
						`,
						optionalGuardians: [
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Google account',
								entity: alphabet,
							},
							{
								type: GuardianType.USER_EXTERNAL_ACCOUNT,
								description: 'Apple account',
								entity: apple,
							},
						],
						optionalGuardiansMinimumConfigurable: 1,
						optionalGuardiansMinimumNeededForRecovery: 1,
						requiredGuardians: [
							// Needed to decrypt encrypted backup.
							{ type: GuardianType.WALLET_PASSWORD },
							// MetaMask data store is a critical dependency here,
							// as without it the encrypted backup is not accessible.
							{
								type: GuardianType.WALLET_PROVIDER,
								description: 'MetaMask data store service',
								entity: consensys,
							},
						],
						secretReconstitution: 'CLIENT_SIDE',
					},
				}),
			},
			bugBountyProgram: null,
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'MetaMask supports Ledger, Trezor, Lattice (GridPlus), Keystone, OneKey, and KeepKey hardware wallets through their Hardware Wallet Hub.',
						url: 'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.QR],
					}),
				},
			},
			keysHandling: {
				ref: refTodo,
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [
				{
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/21m4LE3WLYbgWjc33aDcp2/8252073e115688b1dc1500a9c2d33fe4/metamask-delegator-framework-audit-2024-10.pdf',
					auditDate: '2024-10-25',
					auditor: diligence,
					codeSnapshot: {
						date: '2024-10-25',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://assets.ctfassets.net/clixtyxoaeas/4sNMB55kkGw6BtAiIn08mm/f1f4a78d3901dd03848d070e15a1ff12/pentest-report_metamask-signing-snap.pdf',
					auditDate: '2024-10-25',
					auditor: cure53,
					codeSnapshot: {
						date: '2024-03-25',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-03-18-cyfrin-Metamask-DelegationFramework1-v2.0.pdf',
					auditDate: '2025-03-18',
					auditor: cyfrin,
					codeSnapshot: {
						date: '2025-02-07',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
				{
					ref: 'https://github.com/Cyfrin/cyfrin-audit-reports/blob/main/reports/2025-04-01-cyfrin-Metamask-DelegationFramework2-v2.0.pdf',
					auditDate: '2025-04-01',
					auditor: cyfrin,
					codeSnapshot: {
						date: '2025-04-01',
					},
					unpatchedFlaws: 'ALL_FIXED',
					variantsScope: 'ALL_VARIANTS',
				},
			],
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'MetaMask uses Blockaid integration to provide privacy-preserving transaction simulation and malicious contract detection without sharing transaction details with parties other than Consensys.',
							url: 'https://metamask.io/news/latest/metamask-security-alerts-by-blockaid-the-new-normal-for-a-safer-transaction/',
						},
					],
					contractRegistry: true,
					leaksContractAddress: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					previousContractInteractionWarning: true,
					recentContractWarning: true,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation:
								'MetaMask maintains a local phishing database to detect malicious apps and websites without revealing browsing activity to external services.',
							url: 'https://support.metamask.io/ms/privacy-and-security/how-to-turn-on-security-alerts/',
						},
						{
							explanation:
								'Privacy preserving registry of malicious URLs implemented through eth-phishing-detect.',
							url: 'https://github.com/MetaMask/eth-phishing-detect',
						},
					],
					leaksIp: false,
					leaksUserAddress: false,
					leaksVisitedUrl: 'NO',
				}),
				sendTransactionWarning: supported({
					ref: [
						{
							explanation:
								'MetaMask provides address labeling and warns about address poisoning attacks using local address book and transaction history. For enhanced security validation, MetaMask may use Consensys services which share recipient and user addresses along with IP addresses. Users can disable external services to prevent this data sharing.',
							url: 'https://support.metamask.io/configure/privacy/how-to-adjust-metamask-privacy-settings/',
						},
					],
					leaksRecipient: true,
					leaksUserAddress: true,
					leaksUserIp: true,
					newRecipientWarning: true,
					userWhitelist: true,
				}),
			},
			transactionLegibility: {
				ref: refTodo,
				calldataDisplay: displaysFullCallData,
				transactionDetailsDisplay: null,
			},
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
					ref: refTodo,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: supported(comprehensiveFeesShownByDefault),
				erc20L1Transfer: supported(comprehensiveFeesShownByDefault),
				ethL1Transfer: supported(comprehensiveFeesShownByDefault),
				uniswapUSDCToEtherSwap: supported(comprehensiveFeesShownByDefault),
			},
		},
	},
	overrides: {
		attributes: {
			security: {
				scamPrevention: {
					note: mdParagraph(`
						MetaMask collaborated with Blockaid to create a
						[privacy-preserving security feature](https://metamask.io/news/metamask-security-alerts-by-blockaid-the-new-normal-for-a-safer-transaction)
						that simulates transactions and alerts users to malicious apps without
						sharing transaction data with parties outside of Consensys.
					`),
				},
			},
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
	},
}
