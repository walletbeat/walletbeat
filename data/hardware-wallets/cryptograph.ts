import { perpetua } from '@/data/contributors/perpetua'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { notSupported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'

export const cryptograph: HardwareWallet = {
	metadata: {
		id: 'cryptograph',
		displayName: 'Cryptograph',
		tableName: 'Cryptograph',
		blurb: paragraph(`
			Cryptograph is a self-custodial wallet for Apple Watch. The watch
			generates and holds the keys; the iPhone composes transactions
			but holds no keys and cannot sign. Recovery uses an encrypted
			printed QR sheet, or encrypted recovery data hidden inside an
			ordinary JPEG photo via steganography.
		`),
		contributors: [perpetua],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'apple-watch-series-11',
				name: 'Apple Watch Series 11',
				isFlagship: true,
				url: 'https://www.apple.com/shop/buy-watch/apple-watch',
			},
			{
				id: 'apple-watch-ultra-3',
				name: 'Apple Watch Ultra 3',
				isFlagship: false,
				url: 'https://www.apple.com/shop/buy-watch/apple-watch-ultra',
			},
			{
				id: 'apple-watch-se-3',
				name: 'Apple Watch SE 3',
				isFlagship: false,
				url: 'https://www.apple.com/shop/buy-watch/apple-watch-se',
			},
		],
		iconExtension: 'png',
		lastUpdated: '2026-04-30',
		urls: {
			appstore: 'https://apps.apple.com/app/id6759300873',
			docs: ['https://cryptograph.watch/docs', 'https://cryptograph.watch/how-it-works'],
			repositories: [
				'https://github.com/perpetua-engineering/wallet-core',
				'https://github.com/perpetua-engineering/zcash-signer',
			],
			websites: ['https://cryptograph.watch/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: null,
		licensing: {
			type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
			coreLicense: {
				ref: {
					explanation:
						'Cryptograph builds on a public fork of Trust Wallet Core (Apache-2.0) for Bitcoin, Ethereum, and EVM L2 signing primitives.',
					url: 'https://github.com/perpetua-engineering/wallet-core/blob/9d96a0933cfb44355f3591278944889725bda10e/LICENSE',
				},
				license: FOSSLicense.APACHE_2_0,
			},
			walletAppLicense: {
				ref: {
					explanation:
						'The Cryptograph iPhone and watchOS apps are closed-source. They are distributed only as compiled binaries through the App Store.',
					url: 'https://apps.apple.com/app/id6759300873',
				},
				license: SourceNotAvailableLicense.PROPRIETARY,
			},
		},
		monetization: {
			ref: {
				explanation: 'Cryptograph is a paid one-time purchase on the App Store.',
				url: 'https://apps.apple.com/app/id6759300873',
			},
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
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://cryptograph.watch/privacy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			// Cryptograph's recovery is non-guardian-based: an encrypted Recovery
			// Sheet (a QR code the user prints on paper) or Photo Backup (encrypted
			// recovery data hidden inside an ordinary JPEG photo via steganography).
			// Both encode the same encrypted seed material; neither is a
			// guardian-based social-recovery scheme.
			// See: https://cryptograph.watch/how-it-works
			accountRecovery: {
				guardianRecovery: notSupported,
			},
			bugBountyProgram: notSupported,
			duressResistance: null,
			firmware: null,
			keysHandling: {
				ref: [
					{
						explanation:
							'Mnemonic is generated on the watch and stored in the watchOS Keychain, encrypted with ChaCha20-Poly1305 using a key derived via a Secure Enclave P-256 ECDH operation. The Secure Enclave holds one P-256 ECDH wrapping key that never leaves hardware. Chain signing keys (Bitcoin, Ethereum, etc.) are BIP-32 derived from the mnemonic in watch app memory at sign time and zeroed on deallocation. The iPhone holds no mnemonic, no Secure Enclave key, and no chain keys.',
						url: 'https://cryptograph.watch/how-it-works',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: null,
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
