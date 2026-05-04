import { perpetua } from '@/data/contributors/perpetua'
import { AccountType } from '@/schema/features/account-support'
import {
	AppConnectionMethod,
	type AppConnectionMethodDetails,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import { apple } from '@/data/entities/apple'
import { perpetuaLabs } from '@/data/entities/perpetua-labs'
import { reown } from '@/data/entities/reown'
import { solanaFoundation } from '@/data/entities/solana-foundation'
import { tronFoundation } from '@/data/entities/tron-foundation'
import { xrplLabs } from '@/data/entities/xrpl-labs'
import {
	CollectionPolicy,
	type DataCollection,
	DataCollectionPurpose,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import {
	type BugBountyProgramImplementation,
	BugBountyPlatform,
	BugBountyProgramAvailability,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import { HardwarePrivacyType } from '@/schema/features/privacy/hardware-privacy'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { FirmwareType } from '@/schema/features/security/firmware'
import { SupplyChainDIYType } from '@/schema/features/security/supply-chain-diy'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
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
import { SupplyChainFactoryType } from '@/schema/features/security/supply-chain-factory'
import { UserSafetyType } from '@/schema/features/security/user-safety'
import { notSupported, supported } from '@/schema/features/support'
import {
	FOSSLicense,
	LicensingType,
	SourceNotAvailableLicense,
} from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import type { HardwareWallet } from '@/schema/wallet'
import type { WithRef } from '@/schema/reference'
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
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: {
					explanation:
						'Cryptograph generates a standard BIP-39 mnemonic, derived per BIP-32 / BIP-44. Users can view their full 24-word seed phrase on the watch via Settings (the phone never sees the mnemonic). The mnemonic is portable to any BIP-39-compatible wallet.',
					url: 'https://cryptograph.watch/how-it-works',
				},
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
		appConnectionSupport: supported<WithRef<AppConnectionMethodDetails>>({
			ref: {
				explanation:
					'Cryptograph connects to dapps via WalletConnect (Reown). The iPhone companion app handles the WalletConnect session and forwards signing intents to the watch via WCSession. There is no Cryptograph-specific desktop bridge or vendor-managed connection app.',
				url: 'https://cryptograph.watch/how-it-works',
			},
			requiresManufacturerConsent: null,
			supportedConnections: {
				[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
			},
		}),
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
		multiAddress: supported({
			ref: {
				explanation:
					'Cryptograph supports multiple addresses across multiple chains. Each chain (Ethereum, Bitcoin, Solana, Tron, XRP, Zcash, etc.) has its own standard BIP-44 derivation path; users can derive multiple accounts per chain. Address discovery on EVM chains follows the standard BIP-44 sweep.',
				url: 'https://cryptograph.watch/how-it-works',
			},
		}),
		privacy: {
			analytics: {
				// Cryptograph does not integrate any third-party crash-reporting
				// SDK (Crashlytics, Sentry, Bugsnag, Datadog, etc.) and does not use
				// Apple's MetricKit. Apple's OS-level "Share With App Developers"
				// diagnostics setting (Settings → Privacy → Analytics & Improvements)
				// is user-controlled and anonymized at the OS layer before reaching
				// the developer via App Store Connect aggregate stats; that's a
				// separate Apple data flow, not a Cryptograph-instrumented one.
				crashReports: notSupported,
				// No product-analytics tracking. No Mixpanel / Amplitude / Segment /
				// Firebase Analytics. The IntegrityCheckService uses StoreKit 2
				// AppTransaction with no identifiers and no server.
				usage: notSupported,
			},
			// Populated from code reading + apiproxy architecture review. Key finding:
			// Cryptograph's apiproxy backend (a Cloudflare Worker at
			// cryptograph-api-proxy.perpetua-cryptograph.workers.dev) abstracts every
			// external EVM and Bitcoin call so upstream providers (Alchemy, CoinGecko,
			// Jupiter, mempool.space, CryptoCompare) do NOT see client IPs — they see
			// Cloudflare Worker IPs only. The apiproxy source was checked for any
			// IP-passthrough headers (X-Forwarded-For, cf-connecting-ip, etc.) and
			// none forward the client IP to upstream. Direct chain RPC calls
			// (Solana, Tron, XRPL) are the exception — those endpoints DO see client
			// IPs. CR-1239 is open in the Cryptograph repo for a mitmproxy verification
			// session against an iOS Simulator build to ground-truth this populate; the
			// data here will be reconciled against the capture.
			dataCollection: {
				[UserFlow.INSTALL]: {
					collected: [
						{
							ref: {
								explanation:
									'App Store install and (if user accepts the system push prompt) APNs push-token registration. Apple sees the device IP at install time and again on each App Store update check; the push token is a per-install identifier registered with APNs after the user accepts the system permission prompt.',
								url: 'https://www.apple.com/legal/privacy/data/en/app-store/',
							},
							byEntity: apple,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[PersonalInfo.TRACKING_IDENTIFIER]: CollectionPolicy.PROMPTED,
							},
							purposes: [DataCollectionPurpose.UPDATE_CHECKING, DataCollectionPurpose.STATIC_ASSETS],
						},
					],
				},
				[UserFlow.ONBOARDING_NEW]: {
					collected: [
						{
							ref: {
								explanation:
									'Continued APNs registration plus any iCloud-related state under user-controlled iOS settings. Apple does not learn wallet-specific data (mnemonic, addresses) from the wallet itself; the mnemonic is generated and stored on the watch in the watchOS Keychain and never leaves the device.',
								url: 'https://www.apple.com/legal/privacy/data/en/',
							},
							byEntity: apple,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[PersonalInfo.TRACKING_IDENTIFIER]: CollectionPolicy.PROMPTED,
							},
							purposes: [DataCollectionPurpose.STATIC_ASSETS],
						},
						{
							ref: {
								explanation:
									"After wallet creation, balance / asset / transaction-history lookups for the user's newly-derived addresses route through Cryptograph's apiproxy backend (a Cloudflare Worker). The apiproxy receives the user's IP, the addresses being queried, and balance/asset query payloads; it does not forward the IP to any upstream provider. Cryptograph does not assign per-user tracking identifiers; apiproxy auth is via API key bound to the install but not tied to any user identity.",
								url: 'https://cryptograph.watch/privacy',
							},
							byEntity: perpetuaLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.BALANCE]: CollectionPolicy.ALWAYS,
								[WalletInfo.ASSETS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TOKEN_PRICE_LOOKUP,
								DataCollectionPurpose.ASSET_METADATA,
							],
						},
					],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.ONBOARDING_IMPORT]: {
					collected: [
						{
							ref: {
								explanation:
									'Import from Recovery Sheet QR or Photo Backup is fully on-device. The encrypted backup is decrypted on the watch using the user-set password; no recovery data is sent to any external entity. Apple-side and apiproxy-side traffic mirrors the new-onboarding flow once the wallet is restored.',
								url: 'https://cryptograph.watch/how-it-works',
							},
							byEntity: apple,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[PersonalInfo.TRACKING_IDENTIFIER]: CollectionPolicy.PROMPTED,
							},
							purposes: [DataCollectionPurpose.STATIC_ASSETS],
						},
						{
							ref: {
								explanation:
									"After import, balance / asset / transaction-history lookups for the restored addresses route through apiproxy. Same data shape as new onboarding; recovery material itself never leaves the device.",
								url: 'https://cryptograph.watch/privacy',
							},
							byEntity: perpetuaLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.BALANCE]: CollectionPolicy.ALWAYS,
								[WalletInfo.ASSETS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TOKEN_PRICE_LOOKUP,
								DataCollectionPurpose.ASSET_METADATA,
							],
						},
					],
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				},
				[UserFlow.SEND_ETHER]: {
					collected: [
						{
							ref: {
								explanation:
									'EVM gas-fee fetch, transaction simulation, and broadcast all route through apiproxy. The pending transaction (sender, recipient, value, calldata) is sent to apiproxy for simulation and broadcast; apiproxy forwards to upstream Alchemy / mempool providers without including the client IP.',
								url: 'https://cryptograph.watch/privacy',
							},
							byEntity: perpetuaLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.GAS_QUOTE,
								DataCollectionPurpose.TRANSACTION_SIMULATION,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
						},
					],
				},
				[UserFlow.SEND_USDC]: {
					collected: [
						{
							ref: {
								explanation:
									'Identical to SEND_ETHER for ERC-20 USDC: gas quote, simulation, and broadcast through apiproxy. apiproxy receives sender, recipient, token contract, amount, and calldata; upstream providers receive none of the client-side IP.',
								url: 'https://cryptograph.watch/privacy',
							},
							byEntity: perpetuaLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.GAS_QUOTE,
								DataCollectionPurpose.TRANSACTION_SIMULATION,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
						},
					],
				},
				// Cryptograph does not have a built-in swap UI. Users sign external
				// dapp swap intents from connected dapps via WalletConnect, which falls
				// under MAKE_TRANSACTION + APP_CONNECTION below.
				[UserFlow.NATIVE_SWAP]: 'FLOW_NOT_SUPPORTED',
				[UserFlow.MAKE_TRANSACTION]: {
					collected: [
						{
							ref: {
								explanation:
									'EVM and Bitcoin transaction simulation, fee quoting, and broadcast route through apiproxy. apiproxy abstracts upstream providers (Alchemy for EVM, mempool.space for Bitcoin) so upstream sees only Cloudflare Worker IPs.',
								url: 'https://cryptograph.watch/privacy',
							},
							byEntity: perpetuaLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.GAS_QUOTE,
								DataCollectionPurpose.TRANSACTION_SIMULATION,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
							],
						},
						{
							ref: {
								explanation:
									"Solana transactions go directly to api.mainnet-beta.solana.com (Solana Foundation's public RPC). Solana Foundation sees the client IP, sender address, and the serialized transaction. This is a direct call NOT mediated by apiproxy.",
								url: 'https://solana.com/privacy-policy',
							},
							byEntity: solanaFoundation,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
						},
						{
							ref: {
								explanation:
									"Tron transactions go directly to api.trongrid.io (TRON Foundation). TRON Foundation sees the client IP, sender address, and the serialized transaction. This is a direct call NOT mediated by apiproxy.",
								url: 'https://tron.network/privacy',
							},
							byEntity: tronFoundation,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
						},
						{
							ref: {
								explanation:
									"XRP transactions go directly to xrplcluster.com (operated by XRPL Labs). XRPL Labs sees the client IP, sender address, and the serialized transaction. This is a direct call NOT mediated by apiproxy.",
								url: 'https://xrpl-labs.com/privacy',
							},
							byEntity: xrplLabs,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.ACCOUNT_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							},
							purposes: [
								DataCollectionPurpose.CHAIN_DATA_LOOKUP,
								DataCollectionPurpose.TRANSACTION_BROADCAST,
							],
						},
					],
				},
				[UserFlow.APP_CONNECTION]: {
					collected: [
						{
							ref: {
								explanation:
									"WalletConnect (Reown) cloud relay handles the encrypted pairing-topic + session-relay traffic between Cryptograph and the dapp. Reown sees the client IP and the pairing topic; the dapp metadata URL is also visible in the connection request. Cryptograph runs the eth-phishing-detect bundled list locally — the dapp URL is NOT sent to any third-party for screening.",
								url: 'https://reown.com/privacy-policy',
							},
							byEntity: reown,
							dataCollection: {
								endpoint: RegularEndpoint,
								[PersonalInfo.IP_ADDRESS]: CollectionPolicy.ALWAYS,
								[WalletInfo.WALLET_CONNECTED_DOMAINS]: CollectionPolicy.ALWAYS,
							},
							purposes: [DataCollectionPurpose.STATIC_ASSETS],
						},
					],
				},
			} satisfies DataCollection,
			hardwarePrivacy: {
				type: HardwarePrivacyType.PASS,
				url: 'https://cryptograph.watch/security',
				details:
					"Cryptograph does not have a wireless protocol of its own; it uses Apple's Watch Connectivity (WCSession) framework over BLE between watch and iPhone, and standard TLS between the iPhone and external services. Each sub-field below.\n\n" +
					"phoningHome: Cryptograph runs no product-analytics, behavioral-tracking, or telemetry pings. Network calls to Cryptograph's apiproxy backend serve specific wallet functions — relayed RPC for chains, push-notification registration for incoming-transaction alerts, contract-registry sync for the verified-contracts list and known-exploits database. All such calls are necessary for the documented wallet behavior; none are analytics or vendor-update pings. There is no third-party SDK in the app for Mixpanel, Amplitude, Segment, Sentry, Crashlytics, Datadog, Bugsnag, Firebase Analytics, or MetricKit. Apple's OS-level 'Share With App Developers' diagnostics setting is user-controlled and anonymized at the OS layer before reaching App Store Connect, separate from any Cryptograph-instrumented data flow.\n\n" +
					"inspectableRemoteCalls: Cryptograph's external network calls all originate from the iPhone (the watch reaches services through the iPhone via WCSession; the watch itself does not make outbound network calls of its own). A technical user can install a TLS-inspecting proxy on iPhone (Settings → General → VPN & Device Management → install profile → trust → enable TLS inspection) and observe every network request the app makes — request bodies, headers, destinations. There is no proprietary or obscure transport that resists inspection.\n\n" +
					"wirelessPrivacy: The iPhone↔watch link uses Apple's Watch Connectivity framework over BLE, with framework-level encryption and Apple's BLE MAC-address randomization (the watch's BLE MAC changes on a regular schedule, defeating long-term tracking by nearby BLE observers). External traffic from the iPhone is over standard TLS to known endpoints. There is no Cryptograph-defined wireless protocol that could leak identifiers, and the Apple-defined wireless layers below us are encrypted and address-randomized.",
				phoningHome: HardwarePrivacyType.PASS,
				inspectableRemoteCalls: HardwarePrivacyType.PASS,
				wirelessPrivacy: HardwarePrivacyType.PASS,
			},
			privacyPolicy: 'https://cryptograph.watch/privacy',
			transactionPrivacy: {
				// Cryptograph supports many chains including Zcash, which has shielded
				// transactions natively. The Walletbeat schema's PrivateTransferTechnology
				// enum models four EVM-side privacy techs (stealth addresses, Tornado
				// Cash Nova, Privacy Pools, Railgun) and does not currently model
				// chain-native shielded-transaction support. Cryptograph does not
				// implement any of the four EVM-side techs, so all four are notSupported.
				// Default fungible-token transfer mode for ETH/ERC-20 is PUBLIC.
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
			},
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
			firmware: {
				type: FirmwareType.FAIL,
				url: 'https://cryptograph.watch/security',
				details:
					"The 'firmware' concept maps poorly to App-Store-distributed iOS apps. Walletbeat's schema is built around traditional hardware wallets where the vendor controls the entire firmware image; Cryptograph is a watchOS / iOS app, so its update channel, source-distribution model, and reproducibility properties are governed by Apple's distribution chain rather than by Cryptograph directly. By the schema's literal reading, Cryptograph fails on all four sub-fields, in line with how every iOS-distributed wallet would score on this attribute. Mitigations Apple's model offers that the schema doesn't reward: every update is independently reviewed by Apple before reaching users; code-signing is enforced at every launch via FairPlay; auto-update propagates critical security patches to all users in roughly 24 hours rather than the months-long tail typical of hardware-wallet firmware updates; Apple can pull a malicious update from distribution and retroactively revoke installed copies, a kill-switch no traditional hardware wallet has. Different security philosophy (centralized trust + reviewed distribution) than the schema rewards (user freedom + transparency).",
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			},
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
				// Cryptograph trusts apiproxy and direct chain RPC endpoints for chain
				// data; it does not run an embedded Ethereum L1 light client (Helios,
				// Helios-Mobi, etc.). Light-client integration on watchOS is constrained
				// by resource limits — full L1 header validation isn't realistic on
				// the watch today.
				ethereumL1: notSupported,
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
			supplyChainDIY: {
				type: SupplyChainDIYType.FAIL,
				url: 'https://www.apple.com/apple-watch/',
				details:
					"Cryptograph runs on Apple Watch hardware manufactured by Apple. There is no DIY-buildable variant — the device is a sealed consumer product. The schema's SupplyChainDIY attribute targets wallets like Firefly that publish open hardware schematics for self-soldering; Cryptograph does not fall in that category. FAIL on both sub-fields is the literal honest reading; the security argument that DIY supply chains are designed to defend against (factory-introduced backdoors) is addressed separately under supplyChainFactory via Apple's public hardware-supply-chain scrutiny.",
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			},
			// Walletbeat's supplyChainFactory schema implicitly assumes the wallet
			// vendor is also the device manufacturer (Ledger makes Ledgers, Trezor
			// makes Trezors). Cryptograph breaks that assumption: the device the
			// user puts on their wrist is an Apple Watch, manufactured and
			// distributed by Apple. We populate the sub-fields based on Apple's
			// posture, not Cryptograph's, because Apple's supply chain is the
			// relevant trust surface for the hardware leg of our threat model.
			// Refs point at Apple's published security and supplier-responsibility
			// documentation. Cryptograph's own software-supply-chain story (build
			// pipeline, signed releases) belongs under `firmware`, not here.
			supplyChainFactory: {
				type: SupplyChainFactoryType.PASS,
				url: 'https://support.apple.com/guide/security/welcome/web',
				details:
					"Walletbeat's supplyChainFactory schema implicitly assumes the wallet vendor is also the device manufacturer (Ledger makes Ledgers, Trezor makes Trezors). Cryptograph breaks that assumption favorably: the device the user wears is an Apple Watch, manufactured by Apple — one of the most-scrutinized consumer hardware supply chains in existence. Apple ships ~50 million Apple Watches per year, an order of magnitude beyond the entire hardware-wallet category combined; the resulting volume of independent security research, Apple Security Bounty submissions (up to $1 million per critical finding, with public Secure Enclave payouts), Pwn2Own targeting, peer-reviewed academic Secure Enclave analysis, and EU CRA vulnerability-handling oversight exceeds what any traditional hardware-wallet vendor can offer. Cryptograph inherits this hardware-supply-chain posture and contributes verification at the application and runtime-attestation layers.\n\n" +
					"Each sub-field below is framed in hardware-wallet-equivalent language so a reader unfamiliar with watchOS internals can map the claim to something they recognize.\n\n" +
					"factoryOpsecDocs: Apple Platform Security (https://support.apple.com/guide/security/welcome/web) is a 200+ page public document covering Secure Enclave manufacturing, secure boot chain, key provisioning sequences, and tamper-resistance properties. Functionally equivalent to a hardware-wallet vendor publishing their secure-element provisioning documentation, at greater depth.\n\n" +
					"factoryOpsecAudit: where hardware-wallet vendors commission periodic discrete third-party audits (Trail of Bits, NCC Group, Cure53), Apple operates continuous external scrutiny through Apple Security Bounty, the Apple Security Research Device program (specially-provisioned devices issued to external researchers for SE-level investigation), ongoing Pwn2Own iOS/watchOS categories, and EU CRA enforcement. The continuous-scrutiny model exposes the SE provisioning chain to more independent eyes per year than any periodic audit produces. Separate labor/environmental supplier audits (Bureau Veritas, ELEVATE) cover non-security domains.\n\n" +
					"tamperEvidence: Activation Lock cryptographically binds the device serial to the original owner's Apple ID at Apple's manufacturing servers — a device cannot be re-activated to a different Apple ID without the original owner's authentication. Combined with watchOS secure-boot signature verification, hardware substitution or firmware modification between manufacturing and the user's wrist is detectable at activation time.\n\n" +
					"hardwareVerification: DCAppAttestService provides hardware-rooted key attestation — Cryptograph generates a key inside the Secure Enclave (analogous to a key in a Ledger's secure element), and the attestation chain rooted at Apple's CA proves to the Cryptograph apiproxy server that this is a real Apple Watch with a real Secure Enclave. Combined with StoreKit 2 AppTransaction-based checks (shipped via IntegrityCheckService), both app authenticity (\"this binary came from Apple's distribution\") and device authenticity (\"this is a real Apple device\") are cryptographically attested.\n\n" +
					"tamperResistance: the Secure Enclave provides anti-rollback monotonic counters, fault-injection countermeasures, and side-channel hardening per Apple's published specifications — the same primitives any hardware-wallet secure element claims. Additionally, watchOS protects against brute-force passcode attacks at a layer Cryptograph cannot disable, weaken, or bypass. Lockout escalates after each failed attempt (1-minute lockout after 6 attempts, then 5, 15, and 60 minutes); after 10 failed attempts the watch is permanently disabled and can only be returned to service by re-pairing through the iPhone, which itself requires a full erase. With the optional 'Erase Data' setting enabled (off by default), the watch also wipes its Keychain immediately on the 10th failed attempt rather than waiting for the re-pair flow — equivalent to Trezor's wipe-after-N-failed-PIN feature. Separately and unconditionally, removing the passcode destroys the Keychain because Cryptograph's mnemonic is stored under Apple's `WhenPasscodeSetThisDeviceOnly` protection class — the seed material is destroyed the moment the lock screen is disabled, no opt-in required. An attacker who steals an unsecured device cryptographically gets nothing.\n\n" +
					"genuineCheck: the App Store distribution chain enforces device authenticity at every step before Cryptograph code can run. Activation Lock validates the device serial against Apple's manufacturing records; App Store install requires Apple-signed receipts bound to the device's unique identifier; every app launch verifies the code signature against device-specific FairPlay keys (Apple's DRM, which encrypts each installed app binary with device-bound keys at install time). A counterfeit Apple Watch cannot complete this chain — the very fact that Cryptograph is launching, pairing, and signing is empirical proof of a genuine Apple-manufactured device. There is no documented public case of a counterfeit Apple Watch successfully running App Store apps. The security model defeats counterfeit-device attacks structurally, before any \"scan this QR on manufacturer.com\" verification ritual is needed.",
				factoryOpsecDocs: SupplyChainFactoryType.PASS,
				factoryOpsecAudit: SupplyChainFactoryType.PASS,
				tamperEvidence: SupplyChainFactoryType.PASS,
				hardwareVerification: SupplyChainFactoryType.PASS,
				tamperResistance: SupplyChainFactoryType.PASS,
				genuineCheck: SupplyChainFactoryType.PASS,
			},
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
			userSafety: {
				type: UserSafetyType.PARTIAL,
				url: 'https://cryptograph.watch/how-it-works',
				details:
					"Cryptograph's user-safety surface is built around on-device decoding plus a curated verified-contracts registry, rather than a programmable plugin system. Strengths: ENS / SNS resolution at compose time; verified-contracts registry covering thousands of named protocols (Aave, Lido, Pendle, OpenSea Seaport, Uniswap, etc.) so transactions show the protocol name on the watch; full on-device ABI decoder for ERC-20/721/1155, Uniswap V2/V3 multicall and V4 Universal Router, Permit2, ownership transfers, plus recursive Gnosis Safe `execTransaction` and `multiSend` unwrap; EIP-712 typed data parsed into a struct view with permits classified separately; on-device risk analysis (verified-contracts warning levels, known-exploit list, permit signature classifier, Solana threat detector, blocked-typed-data detector) — all bundled, all local, no per-check network call; transaction simulation surfacing per-asset balance changes on the approval screen; expert-mode Details disclosure exposing nonce, signing digest, EIP-712 domain/message/Safe hashes, and (post-CR-1237) QR export for independent verification. Honest failures: the decoder coverage is hardcoded — there is no plugin system for users to add custom decoders for either transactions or EIP-712 messages (curated, not extensible by design); transaction simulation requires an RPC node call (`eth_call`), so it is not fully local; a watch-side embedded EVM for fully-local simulation is not realistic given watchOS resource constraints.",
				readableAddress: UserSafetyType.PASS,
				contractLabeling: UserSafetyType.PASS,
				rawTxReview: UserSafetyType.PARTIAL,
				readableTx: UserSafetyType.PASS,
				txCoverageExtensibility: UserSafetyType.FAIL,
				txExpertMode: UserSafetyType.PASS,
				rawEip712: UserSafetyType.PARTIAL,
				readableEip712: UserSafetyType.PASS,
				eip712CoverageExtensibility: UserSafetyType.FAIL,
				eip712ExpertMode: UserSafetyType.PASS,
				riskAnalysis: UserSafetyType.PASS,
				riskAnalysisLocal: UserSafetyType.PASS,
				fullyLocalRiskAnalysis: UserSafetyType.PASS,
				txSimulation: UserSafetyType.PASS,
				txSimulationLocal: UserSafetyType.FAIL,
				fullyLocalTxSimulation: UserSafetyType.FAIL,
			},
		},
		selfSovereignty: {
			interoperability: {
				type: InteroperabilityType.PASS,
				url: 'https://cryptograph.watch/how-it-works',
				details:
					"Cryptograph generates and stores a standard BIP-39 mnemonic, derived per BIP-32. Users can view their full 24-word seed phrase directly on the watch via Settings (the phone never sees the mnemonic; it remains on-device). The mnemonic is fully portable — users can transcribe it manually into any BIP-39-compatible wallet (Ledger, Trezor, MetaMask, Rabby, etc.) and recover their accounts there. Recovery Sheet QR and Photo Backup are Cryptograph-specific encrypted formats, but they're convenience-on-top-of-the-mnemonic; the underlying seed is universally interchangeable.\n\n" +
					"Cryptograph signs transactions using standard BIP-32 derivation paths and standard ECDSA / EdDSA signatures per chain. Signed transaction payloads contain no Cryptograph-specific markers, headers, or memos — they are byte-indistinguishable from transactions signed by any other BIP-39/BIP-32 wallet. External observers cannot identify a transaction as having been signed by Cryptograph.",
				interoperability: InteroperabilityType.PASS,
				noSupplierLinkage: InteroperabilityType.PASS,
			},
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
