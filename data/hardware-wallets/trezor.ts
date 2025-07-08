import { nconsigny, patrickalphac } from '@/data/contributors'
import {
	DappConnectionMethod,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-dapp-connection-support'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import {
	DataExtraction,
	displaysFullTransactionDetails,
	noCalldataDecoding,
} from '@/schema/features/security/signing-intent-clarity'
import { supported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const trezorWallet: HardwareWallet = {
	metadata: {
		id: 'trezor',
		displayName: 'Trezor Wallet',
		tableName: 'Trezor',
		blurb: paragraph(`
			Trezor Wallet is a self-custodial hardware wallet built by SatoshiLabs. It
			provides secure storage for cryptocurrencies with an easy-to-use interface.
		`),
		contributors: [nconsigny, patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'trezor-safe-5',
				name: 'Trezor Safe 5',
				isFlagship: true,
				url: 'https://trezor.io/trezor-safe-5',
			},
			{
				id: 'trezor-safe-3',
				name: 'Trezor Safe 3',
				isFlagship: false,
				url: 'https://trezor.io/trezor-safe-3',
			},
			{
				id: 'trezor-model-one',
				name: 'Trezor Model One',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-one',
			},
			{
				id: 'trezor-model-t',
				name: 'Trezor Model T',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-t',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/trezor/trezor-suite',
		url: 'https://trezor.io/',
	},
	features: {
		accountSupport: null,
		dappConnectionSupport: supported({
			details:
				'Trezor supports multiple dApp connection methods including their open-source Trezor Suite, WalletConnect, and integration with popular software wallets like MetaMask and Rabby.',
			ref: 'https://trezor.io/guides/third-party-wallet-apps/third-party-wallet-apps-dapps',
			supportedConnections: {
				[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
				[SoftwareWalletType.AMBIRE]: true,
				[SoftwareWalletType.FRAME]: true,
				[SoftwareWalletType.OTHER]: true,
			},
		}),
		license: null,
		monetization: {
			ref: null,
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
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://trezor.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				details:
					'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
				ref: [
					{
						explanation:
							'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
						url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
					},
				],
				upgradePathAvailable: true,
				url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
			},
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			publicSecurityAudits: null,
			signingIntentClarity: {
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'Trezor provides basic message signing details when using hardware wallets, but some complex interactions may be difficult to verify off device.',
					messageExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.COPY]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				ref: [
					{
						explanation:
							"Independent video demonstration of Trezor's signing implementation on Safe.",
						url: 'https://youtu.be/9YmPWxAvKYY?t=1108',
					},
					{
						explanation: 'Independent video showing transaction details on Trezor Safe 5',
						url: 'https://youtube.com/shorts/4LayLrSuHNg',
					},
				],
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: {
						[DataExtraction.EYES]: true,
						[DataExtraction.COPY]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
					details:
						'Trezor provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.',
					displayedTransactionDetails: {
						...displaysFullTransactionDetails,
						chain: false,
						nonce: false,
					},
				},
			},
			supplyChainDIY: null,
			supplyChainFactory: null,
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			feeTransparency: null,
			maintenance: null,
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}

// Flagship : Trezor safe 5 : @https://trezor.io/trezor-safe-5
// Trezor safe 3 : @https://trezor.io/trezor-safe-3
// Trezor model one : @https://trezor.io/trezor-model-one
// Trezor model T / @https://trezor.io/trezor-model-t
