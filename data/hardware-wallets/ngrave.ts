import { patrickalphac } from '@/data/contributors'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	DappConnectionMethod,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-dapp-connection-support'
import {
	DataExtraction,
	noCalldataDecoding,
	noDataExtraction,
} from '@/schema/features/security/signing-intent-clarity'
import { supported } from '@/schema/features/support'
import { License } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const ngrave: HardwareWallet = {
	metadata: {
		id: 'ngrave',
		displayName: 'NGRAVE Zero',
		tableName: 'NGRAVE',
		blurb: paragraph(`
			NGRAVE Zero is a hardware wallet with EAL7+ secure element, biometric authentication, and QR code scanning capabilities. However, it fails to properly display transaction and message data for verification.
		`),
		contributors: [patrickalphac],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'ngrave-zero',
				name: 'NGRAVE Zero',
				isFlagship: true,
				url: 'https://www.ngrave.io/zero',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-01-07',
		repoUrl: null,
		url: 'https://www.ngrave.io/',
	},
	features: {
		accountSupport: null,
		license: {
			license: License.PROPRIETARY,
			ref: [
				{
					explanation: 'NGRAVE is not open source',
					url: 'https://youtu.be/-m1jcBFS0dc?t=701',
				},
			],
		},
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
			privacyPolicy: 'https://www.ngrave.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: null,
			firmware: null,
			signingIntentClarity: {
				messageSigning: {
					calldataDecoding: noCalldataDecoding,
					details:
						'NGRAVE Zero does not display EIP-712 data properly. It shows an unrecognizable binary format instead of the actual struct data.',
					messageExtraction: {
						[DataExtraction.EYES]: false,
						[DataExtraction.COPY]: false,
						[DataExtraction.HASHES]: false,
						[DataExtraction.QRCODE]: false,
					},
				},
				ref: [
					{
						explanation: 'Independent video demonstration of NGRAVE Zero signing issues',
						url: 'https://youtu.be/-m1jcBFS0dc?t=701',
					},
				],
				transactionSigning: {
					calldataDecoding: noCalldataDecoding,
					calldataExtraction: noDataExtraction,
					details:
						'NGRAVE Zero fails to display calldata properly. It shows calldata in an unrecognizable binary format that cannot be verified.',
					displayedTransactionDetails: {
						chain: false,
						from: true,
						gas: true,
						nonce: false,
						to: true,
						value: true,
					},
				},
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
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
		dappConnectionSupport: supported({
			supportedConnections: {
				[SoftwareWalletType.METAMASK]: true,
				[SoftwareWalletType.RABBY]: true,
			},
			ref: 'https://support.ngrave.io/hc/en-us/articles/20045312764701-How-to-stay-safe-on-web3',
		}),
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
