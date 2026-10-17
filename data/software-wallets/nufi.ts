import { mattmatt } from '@/data/contributors/0xmattmatt'
import { gabrielkerekes } from '@/data/contributors/gabrielkerekes'
import { minimalsm } from '@/data/contributors/minimalsm'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
	TransactionOutcome,
} from '@/schema/features/security/transaction-legibility'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { fullyClosedSource } from '@/schema/features/transparency/license'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

import { metamask7702DelegatorContract } from '../wallet-contracts/metamask-7702-delegator'

export const nufi: SoftwareWallet = {
	metadata: {
		id: 'nufi',
		displayName: 'NuFi',
		tableName: 'NuFi',
		coinspectId: 'nu-fi',
		contributors: [gabrielkerekes, mattmatt, minimalsm],
		iconExtension: 'svg',
		lastUpdated: '2026-10-16',
		urls: {
			docs: ['https://nufi.gitbook.io/'],
			extensions: [
				'https://chromewebstore.google.com/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca',
			],
			repositories: ['https://github.com/nufi-official/nufi'],
			socials: {
				discord: 'https://discord.com/invite/jSyVPAXw3w',
				reddit: 'https://www.reddit.com/r/nufiofficial/',
				x: 'https://x.com/nufiwallet',
			},
			websites: ['https://nu.fi'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: supported({
				ref: {
					explanation:
						'The NuFi FAQ mentions the use the MetaMask Delegator contract as smart account implementation.',
					label: 'NuFi support site',
					url: 'https://support.nu.fi/support/solutions/articles/80001178239',
				},
				contract: metamask7702DelegatorContract,
			}),
			eoa: supported({
				ref: refTodo,
				canExportPrivateKey: false,
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
			delegation: {
				duringEOACreation: 'NO',
				duringEOAImport: 'NO',
				duringFirst7702Operation: supported({
					type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS',
					nonDelegationTransactionDetailsIdenticalToNormalFlow: true,
				}),
				fee: {
					crossChainGas: notSupported,
					walletSponsored: notSupported,
				},
			},
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: fullyClosedSource,
		monetization: {
			ref: refTodo,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: false,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: true,
				transparentConvenienceFees: false,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://nu.fi/privacy-and-cookies-policy',
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
						connectionTypes: [HardwareWalletConnection.webUSB, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.QR],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.ONEKEY]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.BITBOX]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							'NuFi shows the chain, the ETH amount sent, and the network fee of an ETH transfer by default. The sender and recipient addresses are under "General" and the gas settings under "Gas settings". Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
						file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-eth-transfer.png',
						label: 'NuFi transaction request for an ETH transfer',
					},
					{
						explanation:
							'Opening "General" shows the sender and recipient addresses, and opening "Gas settings" shows the max fee per gas and the gas limit. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
						file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-eth-transfer-general-gas-settings.png',
						label: 'NuFi ETH transfer request with General and Gas settings opened',
					},
					{
						explanation:
							'The RAW view of the request shows the transaction as JSON, including the nonce. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
						file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-eth-transfer-raw.png',
						label: 'NuFi RAW view of an ETH transfer request',
					},
					{
						explanation:
							'NuFi shows a USDC approval as a token access approval for 0.01 USDC. The spender is not shown. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
						file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-usdc-approval.png',
						label: 'NuFi transaction request for a USDC approval',
					},
				],
				erc4361: notSupportedWithRef({
					ref: [
						{
							explanation:
								'NuFi shows a Sign-In with Ethereum request as plain text, like any other message. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-siwe.png',
							label: 'NuFi signature request for an ERC-4361 sign-in message',
						},
					],
				}),
				erc7730: supported({
					ref: [
						{
							explanation:
								'NuFi does not decode a USDC approval. It shows the token and the approved amount, but neither the function nor the spender. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-usdc-approval.png',
							label: 'NuFi transaction request for a USDC approval',
						},
						{
							explanation:
								'NuFi does not decode an Aave supply. It only shows the ETH amounts, the fee, the addresses, and the gas settings. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-aave-supply.png',
							label: 'NuFi transaction request for an Aave supply',
						},
						{
							explanation:
								'NuFi does not decode the Aave supply nested within a Safe{Wallet} transaction. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-safe-aave-supply.png',
							label: 'NuFi transaction request for a Safe{Wallet} Aave supply',
						},
						{
							explanation:
								'NuFi does not decode the inner calls of a Safe{Wallet} MultiSend batching a USDC approval and Aave supply. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-safe-batch-approve-supply.png',
							label: 'NuFi transaction request for a Safe{Wallet} batched approve and supply',
						},
						{
							explanation:
								"After the user accepts NuFi's prompt to use an EIP-7702 smart account, NuFi shows a batched USDC approval and Aave supply from an EOA as one transaction to the user's own address, without decoding the inner calls. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.",
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-batch-approve-supply.png',
							label: 'NuFi batch request for a batched approve and supply',
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						decoded: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				erc8213: supported({
					ref: [
						{
							explanation:
								'NuFi shows the EIP-712 message fields with truncated values by default, and the message as JSON after opening "View raw message". The domain and type definitions are not shown, and no domain hash, message hash or EIP-712 digest is shown. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-eip712.png',
							label: 'NuFi signature request for an EIP-712 message',
						},
						{
							explanation:
								'The HEX tab of the RAW view shows the raw calldata, and its copy button copies it. NuFi does not decode the calldata or show a calldata digest. Captured on NuFi 35.2.0 using the Walletbeat tester, with the request rejected before signing.',
							file: 'public/references/wallets/nufi/screenshots/2026-10-16-nufi-usdc-approval-raw-hex.png',
							label: 'NuFi RAW view of a USDC approval calldata',
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_OPTIONALLY,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_OPTIONALLY,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: null,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
					[BasicBenchmarkTransactions.ETH_TRANSFER]: {
						transactionOutcome: TransactionOutcome.EXPLAINED,
					},
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: null,
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: null,
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					ref: refTodo,
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: supported({
			ref: refTodo,
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
