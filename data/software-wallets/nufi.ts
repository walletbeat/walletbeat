import { mattmatt } from '@/data/contributors/0xmattmatt'
import { gabrielkerekes } from '@/data/contributors/gabrielkerekes'
import { refi93 } from '@/data/contributors/refi93'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import type { AddressResolutionData } from '@/schema/features/privacy/address-resolution'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
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
		contributors: [gabrielkerekes, mattmatt, refi93],
		iconExtension: 'svg',
		lastUpdated: '2026-10-21',
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
						'NuFi uses the MetaMask Delegator contract for EIP-7702 smart accounts, and can include the delegation in the same transaction as a batch.',
					label: 'NuFi EVM smart accounts',
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
			ref: {
				explanation:
					'The Ethereum send form resolves a plain ENS name through the chain RPC. It does not resolve ERC-7828 or ERC-7831 names.',
				label: 'NuFi web wallet',
				url: 'https://wallet.nu.fi',
			},
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: supported<AddressResolutionData>({
				medium: 'CHAIN_CLIENT',
			}),
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
				ref: {
					explanation:
						'The Ethereum connector implements the MetaMask provider API, including provider events, and announces the wallet with EIP-6963.',
					label: 'NuFi Ethereum connector',
					url: 'https://nufi.gitbook.io/developer-docs/nufi-wallet/dapp-connector',
				},
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: fullyClosedSource,
		monetization: {
			ref: [
				{
					explanation:
						'NuFi lists three completed Project Catalyst projects on its about page, so ecosystem grants fund part of its development.',
					label: 'NuFi about page',
					url: 'https://nu.fi/about',
				},
				{
					label: 'Project Catalyst: Ethereum and Cardano web3 wallet',
					url: 'https://projectcatalyst.io/funds/9/the-great-migration-from-ethereum/ethereum-and-cardano-web3-wallet',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: false,
				ecosystemGrants: true,
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
				ref: [
					{
						explanation:
							'NuFi pairs a Ledger by cable or Bluetooth. The cable path uses the browser WebHID API.',
						label: 'Pair a Ledger',
						url: 'https://support.nu.fi/support/solutions/articles/80001171374-manage-ledger-nano-s-s-x-flex-stax-using-nufi-wallet',
					},
					{
						explanation:
							'NuFi pairs a Trezor by cable through the Trezor Suite desktop app, or through the browser WebUSB API.',
						label: 'Pair a Trezor',
						url: 'https://support.nu.fi/support/solutions/articles/80001171361-manage-trezor-t-safe3-safe5-and-safe7-using-nufi-wallet',
					},
					{
						explanation: 'NuFi pairs a Keystone 3 Pro by cable over WebUSB.',
						label: 'Pair a Keystone 3 Pro',
						url: 'https://support.nu.fi/support/solutions/articles/80001172601-manage-keystone-3-pro-using-nufi-wallet',
					},
					{
						explanation:
							'NuFi pairs a GridPlus Lattice1 through the Lattice Connector. The device stays online, and NuFi does not open a USB session.',
						label: 'Pair a GridPlus Lattice1',
						url: 'https://support.nu.fi/support/solutions/articles/80001171377-manage-gridplus-lattice1-using-nufi-wallet',
					},
					{
						explanation: 'NuFi pairs a OneKey by USB cable through the browser WebUSB API.',
						label: 'Pair a OneKey',
						url: 'https://support.nu.fi/support/solutions/articles/80001175825-manage-onekey-device-using-nufi-wallet',
					},
					{
						explanation: 'NuFi pairs a BitBox02 by cable. The browser connection uses WebHID.',
						label: 'Pair a BitBox02',
						url: 'https://support.nu.fi/support/solutions/articles/80001172583-manage-bitbox02-using-nufi-wallet',
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webHID, HardwareWalletConnection.bluetooth],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.USB, HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.GRIDPLUS]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.vendorCloud],
					}),
					[HardwareWalletType.ONEKEY]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
					[HardwareWalletType.BITBOX]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webHID],
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
				ref: refTodo,
				// transactionDetailsDisplay: {
				// 	chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	from: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// 	nonce: DataDisplayOptions.NOT_DECODED,
				// 	to: DataDisplayOptions.SHOWN_OPTIONALLY,
				// 	value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				// },
				erc4361: null,
				erc7730: null,
				erc8213: null,
				transactionDetailsDisplay: null,
				transactionSimulations: null,
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
