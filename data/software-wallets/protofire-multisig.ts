import { msvstj } from '@/data/contributors/msvstj'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	displaysFullTransactionDetails,
} from '@/schema/features/security/transaction-legibility'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { refNotNecessary, refTodo } from '@/schema/reference'
import { Variant } from '@/schema/variants'

export const protofireMultisig: SoftwareWallet = {
	metadata: {
		id: 'protofire-multisig',
		displayName: 'Protofire Multisig',
		tableName: 'Protofire',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [msvstj],
		iconExtension: 'svg',
		lastUpdated: '2026-10-29',
		urls: {
			docs: ['https://safe-support.protofire.io/'],
			others: [
				{ label: 'Terms of service', url: 'https://app.safe.protofire.io/terms' },
				{ label: 'Privacy policy', url: 'https://app.safe.protofire.io/privacy' },
			],
			repositories: ['https://github.com/protofire/protofire-multisig'],
			socials: {
				linkedin: 'https://www.linkedin.com/company/protofire-io/',
				x: 'https://x.com/protofire',
			},
			webapps: ['https://app.safe.protofire.io/'],
			websites: ['https://safe.protofire.io/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: refTodo,
				contract: 'UNKNOWN',
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: refNotNecessary,
				canDeployNew: true,
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				supportedOwners: 'ANY_NUMBER_OF_SIGNERS',
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
		},
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
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation:
						'Protofire Multisig keeps the GPL-3.0 license of the upstream Safe web interface it is forked from. The whole repository, including the ERC-7730 clear signing feature, is covered by this license.',
					label: 'Protofire Multisig license file',
					url: 'https://github.com/protofire/protofire-multisig/blob/9f2b29a5ed0fda72ee2e763a26ee7902f087cc83/LICENSE#not-line-specific',
				},
				license: FOSSLicense.GPL_3_0,
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
			privacyPolicy: 'https://app.safe.protofire.io/privacy',
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
						connectionTypes: [HardwareWalletConnection.webHID],
					}),
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: null,
			transactionLegibility: {
				ref: refTodo,
				erc4361: null,
				erc7730: supported({
					ref: [
						{
							explanation:
								'Protofire Multisig shows the USDC approval through its built-in ABI-decoded approval view with the spender and allowance. After the user presses the ERC-7730 lookup button, the lookup correctly reports that no descriptor exists for this call.',
							file: 'public/references/wallets/protofire-multisig/screenshots/2026-10-29-protofire-multisig-erc7730-usdc-approval.png',
							label: 'Protofire Multisig transaction builder confirmation for a USDC approval',
						},
						{
							explanation:
								'After the user presses the ERC-7730 lookup button, Protofire Multisig resolves the Aave Pool descriptor and shows the supply intent, the amount to supply, and the collateral recipient.',
							file: 'public/references/wallets/protofire-multisig/screenshots/2026-10-29-protofire-multisig-erc7730-aave-supply.png',
							label: 'Protofire Multisig clear signing panel for an Aave supply',
						},
						{
							explanation:
								'After the user presses the ERC-7730 lookup button, Protofire Multisig resolves the Safe contract descriptor for the outer transaction and shows the sign multisig operation intent, the operation type, the source Safe contract, and the execution signer. The nested Aave supply is resolved as well and shows the supply intent, the amount to supply, and the collateral recipient.',
							file: 'public/references/wallets/protofire-multisig/screenshots/2026-10-29-protofire-multisig-erc7730-safe-aave-supply.png',
							label: 'Protofire Multisig clear signing panel for a Safe contract Aave supply',
						},
						{
							explanation:
								'Protofire Multisig unpacks a MultiSend nested within a Safe contract transaction into the outer Safe contract call and its separate actions. After the user presses the lookup button for all actions, the outer call shows the sign multisig operation intent with the delegate call operation type. The Aave supply shows the supply intent, the amount to supply, and the collateral recipient, while the USDC approval keeps the native approval view.',
							file: 'public/references/wallets/protofire-multisig/screenshots/2026-10-29-protofire-multisig-erc7730-safe-batch-approve-supply.gif',
							label:
								'Protofire Multisig clear signing panels for a Safe contract batched approve and supply',
						},
						{
							explanation:
								'Registry descriptors for Safe contracts are keyed by the singleton address, while transactions target a proxy. Protofire Multisig reads the singleton from the proxy and aliases the descriptor to the proxy address, so calls to a Safe contract resolve to the sign multisig operation descriptor and their nested calls are formatted.',
							label: 'Protofire Multisig Safe proxy to singleton descriptor alias',
							url: 'https://github.com/protofire/protofire-multisig/blob/9f2b29a5ed0fda72ee2e763a26ee7902f087cc83/apps/web/src/features/erc7730/safeSingleton.ts#L77-L108',
						},
						{
							explanation:
								'Protofire Multisig unpacks a MultiSend batching a USDC approval and an Aave supply into separate actions and looks up each one. After the user presses the ERC-7730 lookup button, the Aave supply shows the supply intent, the amount to supply, and the collateral recipient, while the USDC approval keeps the native approval view.',
							file: 'public/references/wallets/protofire-multisig/screenshots/2026-10-29-protofire-multisig-erc7730-batch-approve-supply.png',
							label: 'Protofire Multisig clear signing panel for a batched approve and supply',
						},
						{
							explanation:
								'The browser fetches descriptors from the registry base URL set at build time. The code defaults to the protofire branch of the Protofire registry fork, and the deployed app points it at a Protofire-hosted mirror built from that branch. The lookup is enabled per chain through a feature flag and is available on Ethereum, Arbitrum, Base, Optimism, Linea, and other supported networks.',
							label: 'Protofire Multisig ERC-7730 registry URL',
							url: 'https://github.com/protofire/protofire-multisig/blob/9f2b29a5ed0fda72ee2e763a26ee7902f087cc83/apps/web/src/config/constants.extra.ts#L25-L28',
						},
						{
							label: 'Protofire mirror of the Aave Pool descriptor',
							url: 'https://assets.safe.protofire.io/erc7730/registry/aave/calldata-lpv3.json',
						},
						{
							label: 'Protofire fork of the ERC-7730 registry',
							url: 'https://github.com/protofire/clear-signing-erc7730-registry/tree/2649af936458f398416e9aa5dbff722ff67f87af',
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: {
						decoded: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						{
							decoded: DataDisplayOptions.SHOWN_OPTIONALLY,
						},
					[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: {
						decoded: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
				}),
				erc8213: supported({
					ref: refTodo,
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
					},
					messageSigningLegibility: null,
				}),
				transactionDetailsDisplay: displaysFullTransactionDetails,
				transactionSimulations: null,
			},
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: {
				l1: {
					ref: refTodo,
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
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
		walletCall: supported({
			ref: refTodo,
			atomicMultiTransactions: featureSupported,
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
