import { perpetua } from '@/data/contributors/perpetua'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	type BugBountyProgramImplementation,
	BugBountyPlatform,
	BugBountyProgramAvailability,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	BasicBenchmarkTransactions,
	ComplexBenchmarkTransactions,
	DataDecoded,
	DataDisplayOptions,
	DataExtraction,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import type { ScamUrlWarning } from '@/schema/features/security/scam-alerts'
import { notSupported, supported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import { paragraph } from '@/types/content'
import type { CalendarDate } from '@/types/date'

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
		lastUpdated: '2026-05-03',
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
			// Walletbeat's accountRecovery schema only models guardian-based ("social")
			// recovery. Cryptograph's recovery is non-guardian-based: an encrypted
			// Recovery Sheet (QR code the user prints on paper) or Photo Backup
			// (encrypted recovery data steganographically hidden inside an ordinary
			// JPEG photo). Setting `null` here marks the feature unrated rather than
			// asserting recovery does not exist. See: https://cryptograph.watch/how-it-works
			accountRecovery: null,
			bugBountyProgram: supported<BugBountyProgramImplementation>({
				ref: [
					{
						explanation:
							'Cryptograph runs a self-hosted bug bounty program with full Safe Harbor for security researchers acting in good faith. Coverage is full-scope across the watchOS app, iOS app, communication protocol, and recovery formats. Severity is classified per CVSS 4.0 with bootstrap-tier rewards from $100 (Low) to $5,000 (Critical), a $20,000 annual aggregate cap, and a $5,000 per-researcher annual cap. Submissions go through KYC and OFAC sanctions screening before payout.',
						url: 'https://cryptograph.watch/bug-bounty',
					},
				],
				availability: BugBountyProgramAvailability.ACTIVE,
				coverageBreadth: 'FULL_SCOPE',
				dateStarted: '2026-05-03' as CalendarDate,
				disclosure: supported({ numberOfDays: 90 }),
				legalProtections: supported({
					type: LegalProtectionType.SAFE_HARBOR,
					ref: [
						{
							explanation:
								'Cryptograph adopts a Safe Harbor commitment based on the disclose.io core terms, granting researchers acting in good faith explicit waiver of ToS and immunity from civil and criminal action under CFAA, DMCA §1201, and equivalent computer-misuse laws.',
							url: 'https://cryptograph.watch/bug-bounty#safe-harbor',
						},
					],
				}),
				platform: BugBountyPlatform.SELF_HOSTED,
				rewards: supported({
					currency: 'USD',
					maximum: 5000,
					minimum: 100,
				}),
				upgradePathAvailable: true,
			}),
			duressResistance: {
				basicUnlock: {
					ref: {
						explanation:
							'The Apple Watch is unlocked with a numeric passcode and stays unlocked while in contact with the wrist; the iPhone companion app is gated by Face ID (or device passcode). Cryptograph relies on these OS-level protections; it does not implement an additional wallet-specific PIN or password.',
						url: 'https://cryptograph.watch/how-it-works',
					},
					mechanisms: {
						[BasicUnlockMechanism.PIN]: true,
						[BasicUnlockMechanism.BIOMETRIC]: true,
						[BasicUnlockMechanism.PASSWORD]: false,
						[BasicUnlockMechanism.PATTERN]: false,
					},
				},
				duressMode: notSupported,
			},
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
			scamAlerts: {
				contractTransactionWarning: supported({
					ref: [
						{
							explanation:
								'Cryptograph ships with a hardcoded list of verified contracts and a hardcoded list of known-exploit contracts. By default, transactions calling contracts outside the verified list are blocked (lockdown mode), not merely flagged. Both lookups happen on-device; no contract address, user address, or IP leaves the device.',
							url: 'https://cryptograph.watch/how-it-works',
						},
					],
					contractRegistry: true,
					previousContractInteractionWarning: true,
					recentContractWarning: false,
					leaksContractAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
				}),
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation:
								"Cryptograph bundles a pinned snapshot of MetaMask's `eth-phishing-detect` manifest with each App Store release. At WalletConnect connection time, the dapp's metadata URL is checked against the bundled lists locally; exact-match domains block the connection with no override, fuzzy/typo-squat matches show a warning. No per-check network call; no IP, dapp URL, or user address leaves the device during scam-URL screening.",
							url: 'https://cryptograph.watch/security',
						},
						{
							explanation: 'Upstream phishing-domain manifest used as the source list.',
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
								'When the user composes a send to an address they have not previously sent to on the same chain, Cryptograph requires an explicit acknowledgement step before the send button is enabled. The check is local against the per-chain recent-recipients history; no recipient address, user address, or IP is sent to any external service.',
							url: 'https://cryptograph.watch/how-it-works',
						},
					],
					leaksRecipient: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					newRecipientWarning: true,
					userWhitelist: false,
				}),
			},
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: {
				ref: [
					{
						explanation:
							'Transaction details are parsed and rendered on the watch itself. Cryptograph maintains a hardcoded ABI decoder covering ERC-20 / ERC-721 / ERC-1155 transfers and approvals, Uniswap V2 / V3 multicall and Uniswap V4 Universal Router commands, Permit2, ownership transfers, and named-selector lookups for many other functions; transactions to a maintained list of verified contracts (Aave, Lido, Pendle, OpenSea Seaport, etc.) are labeled with the protocol and product name on the watch. Gnosis Safe `execTransaction` and `multiSend` wrappers are recursively unwrapped on the watch (capped at 3 levels deep), so the inner call is shown alongside the Safe label. EIP-712 typed data is parsed on the watch into a struct view; permit-style signatures are classified separately and shown with a dedicated security warning. The Details disclosure on the EIP-712 approval surface exposes the EIP-712 domain hash, message hash, and Safe transaction hash for power-user verification.',
						url: 'https://cryptograph.watch/how-it-works',
					},
				],
				calldataDecoded: {
					[BasicBenchmarkTransactions.ETH_TRANSFER]: DataDecoded.ON_DEVICE,
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: DataDecoded.ON_DEVICE,
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: DataDecoded.ON_DEVICE,
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: DataDecoded.ON_DEVICE,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: DataDecoded.ON_DEVICE,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataDecoded.ON_DEVICE,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataDecoded.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataDecoded.ON_DEVICE,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						DataDecoded.ON_DEVICE,
				},
				detailsDisplayed: {
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				dataExtraction: {
					[DataExtraction.EYES]: true,
					[DataExtraction.QRCODE]: false,
					[DataExtraction.HASHES]: false,
				},
				messageSigningLegibility: {
					decoded: DataDecoded.ON_DEVICE,
					messageSigningDetails: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[MessageSigningDetails.SAFE_HASH]: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
				},
			},
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
