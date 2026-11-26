import { alexanderchopan } from '@/data/contributors/alexanderchopan'
import type { SoftwareWallet } from '@/data/software-wallets'
import { WalletProfile } from '@/schema/features/profile'
import type {
	ContractTransactionWarning,
	SendTransactionWarning,
} from '@/schema/features/security/scam-alerts'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	SimulationBenchmarkTransactions,
} from '@/schema/features/security/transaction-legibility'
import {
	BuiltInSwapDefaultApprovalBehavior,
	SpendingApprovalsControl,
} from '@/schema/features/self-sovereignty/permissions-management'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { notSupported, supported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const source =
	'https://github.com/alexanderchopan/casberi/blob/b7789bb29e48277dffd6f4871ce7d61c42b8a9dd'

export const casberi: SoftwareWallet = {
	metadata: {
		id: 'casberi',
		displayName: 'Casberi',
		tableName: 'Casberi',
		coinspectId: null,
		contributors: [alexanderchopan],
		iconExtension: 'svg',
		lastUpdated: '2026-11-18',
		urls: {
			docs: ['https://casberi.app/docs.html'],
			repositories: ['https://github.com/alexanderchopan/casberi'],
			socials: {
				x: 'https://x.com/casberi_app',
			},
			websites: ['https://casberi.app'],
		},
	},
	features: {
		accountSupport: null,
		addressResolution: {
			ref: refTodo,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			nonChainSpecificEnsResolution: null,
		},
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: {
			browser: {
				ref: refTodo,
				'1193': null,
				'2700': null,
				'6963': null,
			},
		},
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
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: {
				contractTransactionWarning: supported<ContractTransactionWarning>({
					ref: [
						{
							explanation:
								'A send to a contract younger than 30 days is flagged before signing. The contract age is read from Blockscout through Tor. The request carries the contract address and not the address of the user.',
							label: 'Contract age lookup',
							url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L134-L160`,
						},
					],
					contractRegistry: false,
					leaksContractAddress: true,
					leaksUserAddress: false,
					leaksUserIp: false,
					previousContractInteractionWarning: false,
					recentContractWarning: true,
				}),
				scamUrlWarning: notSupported,
				sendTransactionWarning: supported<SendTransactionWarning>({
					ref: [
						{
							explanation:
								'Before a send, the wallet reports a recipient that looks like an address the account paid before, a first send to an address, a sanctioned address and an address reported as a scam. Each of these needs a second tap to send, except the note about a first send.',
							label: 'Send warnings and their order',
							url: `${source}/Casberi/Casberi/Model/MoveWarnings.swift#L19-L96`,
						},
						{
							explanation:
								'The recipient address is sent to GoPlus through Tor. The sanctions list is downloaded whole and matched on the device.',
							label: 'Recipient screening requests',
							url: `${source}/Casberi/Casberi/Model/MoveChecks.swift#L73-L132`,
						},
					],
					addressPoisoningDetection: true,
					leaksRecipient: true,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
				unlimitedApprovalWarning: null,
			},
			securityBestPractices: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							'The Details page of a send or swap lists the recipient in full, the account, the nonce, the network fee, any approval with its spender and exact amount, and the simulation result.',
						label: 'Details page before signing',
						url: `${source}/Casberi/Casberi/Screens/MoveDetails.swift#L30-L160`,
					},
				],
				erc4361: supported({
					ref: [
						{
							explanation:
								'A Sign-In with Ethereum message is parsed by its grammar and summarized. The wallet warns when the message names a site other than the page that asked.',
							label: 'Sign-In with Ethereum parsing',
							url: `${source}/Casberi/Casberi/Model/SafeStatement.swift#L68-L152`,
						},
					],
				}),
				erc7730: supported({
					ref: [
						{
							explanation:
								'A snapshot of the ERC-7730 clear signing registry is bundled with the app and read on the device. Calldata is decoded from the raw bytes, with nested calls followed up to three levels. It is used when the phone cosigns a Safe transaction and when an app in the built-in browser asks for a transaction.',
							label: 'Bundled ERC-7730 registry and decoder',
							url: `${source}/Casberi/Casberi/Model/ClearSign.swift#L9-L28`,
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: null,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
				}),
				erc8213: supported({
					ref: [
						{
							explanation:
								'The Raw transaction page shows the hash that is signed as the EIP-712 Digest, the full calldata in hex with a copy button, and the Calldata Digest.',
							label: 'Raw transaction page',
							url: `${source}/Casberi/Casberi/Screens/MoveDetails.swift#L219-L299`,
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					messageSigningLegibility: null,
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_OPTIONALLY,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_OPTIONALLY,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: null,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: null,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
					[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					[SimulationBenchmarkTransactions.FAILED_TRANSACTION]: {
						failure: 'DETECTED' as const,
					},
					[SimulationBenchmarkTransactions.NONDETERMINISTIC_TRANSACTION]: null,
				}),
			},
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							'The Permissions page lists ERC-20 approvals, `Permit2` approvals and operator approvals for ERC-721 and ERC-1155 collections, read from chain logs. Approvals of one single ERC-721 token are not listed.',
						label: 'Approvals read from chain logs',
						url: `${source}/Casberi/Casberi/Model/WalletApprovals.swift#not-line-specific`,
					},
					{
						explanation:
							'A revoke for the account is signed on the phone as one operation per network.',
						label: 'Revoke signed by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccountChain.swift#L2019-L2049`,
					},
					{
						explanation:
							'A swap approves exactly the amount sold, to exactly the router that spends it.',
						label: 'Exact approval for a swap',
						url: `${source}/Casberi/Casberi/Model/YourAccountSwap.swift#L12-L26`,
					},
				],
				approvalsManagement: supported({
					erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				}),
				builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT,
			},
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
		walletCall: null,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
