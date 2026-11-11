import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
	DuressAction,
} from '@/schema/features/security/duress-resistance'
import {
	HardwareWalletConnection,
	HardwareWalletType,
	type SupportedHardwareWallet,
} from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	type ScamUrlWarning,
	type UnlimitedApprovalWarning,
	UnlimitedApprovalWarningBenchmarkSpenders,
} from '@/schema/features/security/scam-alerts'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import {
	BasicBenchmarkTransactions,
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	MessageSigningDetails,
	SimulationBenchmarkTransactions,
} from '@/schema/features/security/transaction-legibility'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	featureSupported,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { OrderflowDisclosureLevel } from '@/schema/features/transparency/orderflow'
import type { ArtifactSigningDetails } from '@/schema/features/transparency/release-transparency'
import { Variant } from '@/schema/variants'
import { parseMobileManifestJson } from '@/tools/manifest-collector/mobile-manifest-parser'

import { mmlado } from '../contributors/mmlado'
import keycardPalAndroidParsed from './manifests/keycardPal/android.parsed.json'
import keycardPalIosParsed from './manifests/keycardPal/ios.parsed.json'

export const keycardPal: SoftwareWallet = {
	metadata: {
		id: 'keycard-pal',
		displayName: 'Keycard Pal',
		tableName: 'Keycard Pal',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [mmlado],
		iconExtension: 'svg',
		lastUpdated: '2026-10-08',
		urls: {
			androidManifestXml:
				'https://raw.githubusercontent.com/mmlado/keycard-pal/refs/heads/main/android/app/src/main/AndroidManifest.xml',
			appstore: 'https://apps.apple.com/app/keycard-pal/id6777478235',
			docs: ['https://github.com/mmlado/keycard-pal#readme'],
			iosInfoPlist:
				'https://raw.githubusercontent.com/mmlado/keycard-pal/refs/heads/main/ios/KeycardPal/Info.plist',
			others: [
				{ label: 'F-Droid repository', url: 'https://fdroid.keycardpal.com/' },
				{ label: 'GitHub releases', url: 'https://github.com/mmlado/keycard-pal/releases' },
			],
			playstore: 'https://play.google.com/store/apps/details?id=com.keycardpal',
			repositories: ['https://github.com/mmlado/keycard-pal'],
			socials: {
				x: 'https://x.com/mmlado_eth',
			},
			websites: ['https://keycardpal.com/'],
		},
	},
	features: {
		accountSupport: {
			defaultAccountType: AccountType.eoa,
			eip7702: notSupported,
			eoa: supported({
				ref: [
					{
						explanation:
							'A new key is a 12 or 24 word BIP39 mnemonic built from entropy returned by the Keycard GENERATE MNEMONIC command.',
						label: 'useGenerateKey.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useGenerateKey.ts#L8-L25',
					},
					{
						explanation:
							'The BIP32 key pair derived from the mnemonic is loaded onto the Keycard, which then holds the key.',
						label: 'useLoadKey.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useLoadKey.ts#L20-L31',
					},
					{
						explanation: "Ethereum accounts use the BIP44 path m/44'/60'/0'.",
						label: 'hdAddress.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/hdAddress.ts#L5',
					},
					{
						explanation:
							'Key export only requests public keys and extended public keys from the card; the app never asks the card for a private key, and the card does not store the mnemonic so it cannot be shown again.',
						label: 'keycardExport.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/keycardExport.ts#L71-L107',
					},
					{
						explanation:
							'Only legacy, EIP-2930 and EIP-1559 transactions are parsed; EIP-7702 (type 4) transactions are not handled.',
						label: 'txParser.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/txParser.ts#L511-L529',
					},
				],
				canExportPrivateKey: false,
				keyDerivation: {
					type: 'BIP32',
					canExportSeedPhrase: false,
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
					explanation:
						'The only ENS code is reverse resolution: it looks up the name for an address already in a sign request, then forward-checks that name. There is no field where the user types a name to resolve into an address.',
					label: 'Keycard Pal ENS client',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/ens/client.online.ts#L8-L36',
				},
				{
					explanation:
						'ENS names appear only as display labels next to addresses that come from a sign request.',
					label: 'Keycard Pal ENS address label',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/ens/EnsAddressLabel.online.tsx#L9-L10',
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
		},
		chainAbstraction: {
			bridging: {
				builtInBridging: notSupported,
				suggestedBridging: notSupported,
			},
			crossChainBalances: {
				ref: [
					{
						explanation:
							'Keycard Pal only signs requests from a watch-only wallet over QR. Balances are shown in the watch-only wallet, not in Keycard Pal, and there is no bridging feature.',
						label: 'Keycard Pal README',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20-L22',
					},
				],
				ether: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: notSupported,
				},
				globalAccountValue: notSupported,
				perChainAccountValue: notSupported,
				usdc: {
					crossChainSumView: notSupported,
					perChainBalanceViewAcrossMultipleChains: notSupported,
				},
			},
		},
		chainConfigurability: notSupportedWithRef({
			ref: [
				{
					explanation:
						'Keycard Pal is an air-gapped signer that talks to a watch-only wallet through QR codes. It is not a chain client: it fetches no balances and broadcasts no transactions, so it has no chain RPC endpoints to configure.',
					label: 'Keycard Pal README',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20-L31',
				},
				{
					explanation:
						'The only user-set RPC URL is for opt-in ENS lookups. It must answer with chain ID 1 and is never used for signing, balances, or broadcasting.',
					label: 'Keycard Pal ENS RPC validation',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/ens/client.online.ts#L38-L53',
				},
			],
		}),
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: {
					explanation:
						'The repository LICENSE file is the standard MIT License text, copyright 2026 mmlado, with no added clause.',
					label: 'Keycard Pal LICENSE',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/LICENSE',
				},
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'Voluntary donations to published Ethereum and Bitcoin addresses, also shown on the About screen; nothing is unlocked in return.',
					label: 'Keycard Pal DONATE.md',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/DONATE.md#L1-L17',
				},
				{
					explanation:
						'Every feature of the app is free; the only other income is a disclosed Keycard affiliate commission on Android, paid by the shop, not the user.',
					label: 'Keycard Pal README advertisement disclosure',
					url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L70-L74',
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: true,
				ecosystemGrants: null,
				governanceTokenLowFloat: false,
				governanceTokenMostlyDistributed: false,
				hiddenConvenienceFees: false,
				publicOffering: false,
				selfFunded: null,
				transparentConvenienceFees: false,
				ventureCapital: false,
			},
		},
		multiAddress: featureSupported,
		privacy: {
			analytics: {
				crashReports: notSupported,
				usage: notSupported,
			},
			appIsolation: {
				createInAppConnectionFlow: supported({
					ref: [
						{
							explanation:
								'During WalletConnect pairing the app reads addresses from the card and lists derivation indices with infinite scroll, so the user can connect a never-used address for a new app. The app keeps no account list.',
							label: 'WalletConnect address selection list',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/screens/WalletConnectPairingScreen/AddressSelectionPhase.tsx#L46-L75',
						},
					],
				}),
				erc7846WalletConnect: notSupported,
				ethAccounts: supported({
					ref: [
						{
							explanation:
								'No address is selected when a pairing starts, and Connect does nothing until the user picks one address.',
							label: 'WalletConnect pairing screen',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/screens/WalletConnectPairingScreen/index.tsx#L62-L139',
						},
						{
							explanation:
								'The approved session exposes exactly the one address the user selected, on each approved chain.',
							label: 'WalletConnect session approval',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/providers/walletConnect/Provider.online.tsx#L205-L237',
						},
					],
					defaultBehavior: ExposedAccountsBehavior.NO_DEFAULT,
				}),
				useAppSpecificLastConnectedAddresses: notSupported,
			},
			dataCollection: null,
			privacyPolicy: 'https://keycardpal.com/privacy.html',
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
			accountRecovery: {
				drills: notSupported,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: notSupportedWithRef({
				ref: [
					{
						explanation:
							'Vulnerabilities go through GitHub private vulnerability reporting. No reward, bounty platform or safe-harbor terms are offered.',
						label: 'Keycard Pal CONTRIBUTING.md, Security section',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/CONTRIBUTING.md#L155-L158',
					},
				],
			}),
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								'Card operations verify the Keycard PIN first by default, with the remaining attempts shown and the card blocked at zero.',
							label: 'useKeycardOperation.ts',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useKeycardOperation.ts#L130-L156',
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.PIN]: supported({
							type: BasicUnlockMechanismSupport.REQUIRED,
						}),
						[BasicUnlockMechanism.PASSWORD]: notSupported,
						[BasicUnlockMechanism.BIOMETRIC]: notSupported,
						[BasicUnlockMechanism.PATTERN]: notSupported,
					},
				},
				duressMode: supported({
					ref: [
						{
							explanation:
								'During card setup the app offers an optional duress PIN that unlocks the card but shows a decoy account.',
							label: 'InitCardScreen.tsx',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/screens/InitCardScreen.tsx#L155-L162',
						},
						{
							explanation: 'The duress PIN is passed to the Keycard INIT command.',
							label: 'useInitCard.ts',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useInitCard.ts#L87-L91',
						},
						{
							explanation: 'Keycard documentation of the duress PIN.',
							label: 'Keycard docs',
							url: 'https://docs.keycard.tech/duress_pin',
						},
					],
					actions: {
						[DuressAction.DECOY_WALLET]: true,
						[DuressAction.SELF_DESTRUCT]: false,
						[DuressAction.ONCHAIN_LOCKDOWN]: false,
						[DuressAction.WIPE_AND_FORWARD]: false,
					},
				}),
			},
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'Keycard Pal is the companion app for the Status Keycard: every signature is produced by the card over NFC, and the app supports no other hardware wallet.',
						label: 'Keycard Pal README',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20-L22',
					},
					{
						explanation:
							'The signing flow sends the digest to the card with the SIGN command over the NFC session and reads the signature back.',
						label: 'Signing on the Keycard over NFC',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/keycardFlows.ts#L84-L95',
					},
				],
				wallets: {
					[HardwareWalletType.KEYCARD]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.NFC],
					}),
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'Key entropy comes from the Keycard GENERATE MNEMONIC command, on hardware the user holds.',
						label: 'useGenerateKey.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useGenerateKey.ts#L8-L25',
					},
					{
						explanation:
							'The single BIP32 key pair is loaded whole onto the Keycard; there is no key splitting or server party.',
						label: 'useLoadKey.ts',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useLoadKey.ts#L20-L31',
					},
					{
						explanation:
							'Private keys never leave the Keycard; only signatures are returned to the app.',
						label: 'README security section',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L211-L216',
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: notSupported,
			},
			passkeyVerification: notSupported,
			publicSecurityAudits: [],
			scamAlerts: {
				contractTransactionWarning: notSupported,
				scamUrlWarning: supported<ScamUrlWarning>({
					ref: [
						{
							explanation:
								'When the optional WalletConnect feature is enabled, a pairing proposal that Reown Verify flags as a scam shows "This site has been flagged as a scam. Do not connect."; an unverified domain shows a caution banner.',
							label: 'WalletConnect proposal scam banner',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/screens/WalletConnectPairingScreen/ProposalPhase.tsx#L50-L68',
						},
						{
							explanation: 'The Confirm button is disabled when the site is flagged as a scam.',
							label: 'Confirm disabled for flagged sites',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/screens/WalletConnectPairingScreen/ProposalPhase.tsx#L236-L243',
						},
					],
					leaksUserAddress: false,
					leaksUserIp: true,
					leaksVisitedUrl: 'DOMAIN_ONLY',
				}),
				sendTransactionWarning: notSupported,
				unlimitedApprovalWarning: supported<UnlimitedApprovalWarning>({
					ref: [
						{
							explanation:
								'An approval for the maximum 256-bit amount shows the allowance as "Unlimited" and a red warning that the spender can transfer all tokens of this type, whatever the spender address. The check is local and makes no network request.',
							label: 'ERC-20 approve unlimited warning',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/DecodedCallSection/Erc20ApproveSection.tsx#L37-L72',
						},
						{
							explanation:
								'EIP-2612 Permit signatures and Uniswap permit signatures with the maximum amount show an "Unlimited permit" warning.',
							label: 'Unlimited permit warning',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/SpecialEip712Section/PermitReviewSection.tsx#L68-L75',
						},
					],
					leaksSpenderAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					warnsOnUnlimitedApproval: {
						[UnlimitedApprovalWarningBenchmarkSpenders.PUBLIC_EOA]: featureSupported,
						[UnlimitedApprovalWarningBenchmarkSpenders.UNISWAP_V3_ROUTER]: featureSupported,
						[UnlimitedApprovalWarningBenchmarkSpenders.PINK_PHISHING_ADDRESS]: featureSupported,
						[UnlimitedApprovalWarningBenchmarkSpenders.RECENTLY_DEPLOYED_CONTRACT]:
							featureSupported,
						[UnlimitedApprovalWarningBenchmarkSpenders.CONTRACT_NOT_INTERACTED_BEFORE]:
							featureSupported,
					},
				}),
			},
			securityBestPractices: {
				browser: 'NOT_A_BROWSER_EXTENSION',
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'Keycard Pal is a companion app for the Status Keycard smart card. It signs over NFC, and the private keys live on the card, not on the phone.',
							label: 'Keycard Pal README: keys stay on the Keycard',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20',
						},
						{
							explanation:
								'A new key comes from the Keycard GENERATE MNEMONIC command, which uses the secure element RNG. The phone only turns the returned indices into words.',
							label: 'Key generation runs on the card',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/hooks/keycard/useGenerateKey.ts#L8-L27',
						},
						{
							explanation:
								'The main manifest declares NFC and CAMERA. The online flavor adds INTERNET in its own manifest, and the React Native network info library merges in the network and WiFi state permissions.',
							label: 'Android permissions (main and full source sets)',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/android/app/src/main/AndroidManifest.xml#L1-L6',
						},
						{
							explanation:
								'The iOS app declares only two usage descriptions: one for the NFC reader and one for the camera.',
							label: 'iOS usage descriptions',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/ios/KeycardPal/Info.plist#L31-L39',
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: parseMobileManifestJson(keycardPalAndroidParsed, keycardPalIosParsed),
					secureRng: SecureRngSource.HARDWARE_ENTROPY,
				},
			},
			transactionLegibility: {
				ref: [
					{
						explanation:
							'The review screen always shows the Signer (from) address, the To address, the Chain name, the Amount (value) and the fee fields (gas price or max fee and priority fee, plus gas limit). The transaction nonce is parsed but never rendered.',
						label: 'Keycard Pal Ethereum sign request review screen',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/SignRequestDetail.tsx#L67-L115',
					},
					{
						explanation:
							'The Simulation tab appears only when the user has entered their own Tenderly credentials in Settings; it is off by default.',
						label: 'Simulation tab gating',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/useSimulation.ts#L86-L87',
					},
					{
						explanation:
							'After the user taps Simulate, the panel shows a Reverted or Success chip, the revert reason, and the asset changes returned by Tenderly.',
						label: 'Simulation result panel',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/SimulationPanel.tsx#L66-L95',
					},
				],
				erc4361: notSupportedWithRef({
					ref: [
						{
							explanation:
								'A personal message, Sign-In with Ethereum included, is shown as plain text on the Message tab, with its ERC-191 Digest on the Digests tab. The app does not parse ERC-4361 fields, and a request that arrives by QR carries no origin to check the domain against.',
							label: 'Personal message panel',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/PersonalMessagePanel.tsx#L31-L67',
						},
						{
							explanation: 'The README lists SIWE among the personal messages the app signs.',
							label: 'Keycard Pal README feature list',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L56',
						},
					],
				}),
				erc7730: supported({
					ref: [
						{
							explanation:
								'Keycard Pal does not use ERC-7730 descriptors; it decodes calldata offline against a bundled database of function selectors. An ERC-20 approve call gets a dedicated Approve view, other known functions such as the Aave supply call get a generic function-and-arguments view, and an unknown function such as the Safe batch call is not decoded. Nested bytes arguments are rendered as hex, so the inner call of a Safe transaction is not decoded.',
							label: 'Calldata decoder',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/txParser.ts#L240-L311',
						},
						{
							explanation:
								'Decoded arguments are stringified as-is; a bytes argument stays a hex string and is never decoded recursively.',
							label: 'Decoded argument formatting',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/txParser.ts#L150-L158',
						},
						{
							explanation:
								'The Decoded tab is the initial tab whenever the selector is known; otherwise there is no Decoded tab.',
							label: 'Transaction data tabs',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/TxDataPanel.tsx#L28-L62',
						},
					],
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
					},
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
						decoded: DataDisplayOptions.SHOWN_BY_DEFAULT,
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
								'Computes the ERC-8213 Calldata Digest (the hash of the calldata length followed by the calldata), the ERC-191 Digest for personal messages, and the EIP-712 Digest from full typed-data JSON or from pre-hashed domain separator and message hash.',
							label: 'ERC-8213 digest computation',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/utils/erc8213.ts#L12-L60',
						},
						{
							explanation:
								'There are three tabs. The Decoded tab opens first when the selector is known. The Digests tab shows the Calldata Digest and an ERC-8213 explainer link, and opens first only when the call is not decoded. The Raw tab shows the full unsigned transaction hex, which contains the calldata. There is no copy button; the text can only be selected by hand.',
							label: 'Transaction Decoded / Digests / Raw tabs',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/TxDataPanel.tsx#L55-L95',
						},
						{
							explanation:
								'The default Details tab shows the primary type, every EIP-712 domain field and every message field (or a dedicated Permit or Safe transaction view). The EIP-712 Digest is in the Digests tab. Domain hash and message hash are not shown for full typed-data JSON.',
							label: 'EIP-712 typed data panel',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/Eip712JsonPanel.tsx#L28-L97',
						},
						{
							explanation:
								'Only for pre-hashed typed data (domain separator and message hash without the JSON), the Details tab shows the domain separator and message hash, and the Digests tab shows the EIP-712 Digest, Domain Hash and Message Hash.',
							label: 'Pre-hashed EIP-712 panel',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/DataTabPanel/Eip712PrehashedPanel.tsx#L52-L82',
						},
						{
							explanation:
								'The digest explainers tell the user to compare the digest with the one shown by the requesting app, and link to the ERC-8213 spec.',
							label: 'ERC-8213 link and digest explainers',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/constants/erc8213.ts#L1-L26',
						},
					],
					calldataDisplay: {
						[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
						[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
						[CallDataDisplay.FORMATTED]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
					messageSigningLegibility: {
						[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
						[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
						[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.SHOWN_OPTIONALLY,
					},
				}),
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.NOT_IN_UI,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: supported({
					[BasicBenchmarkTransactions.ETH_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_20_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_721_TRANSFER]: null,
					[BasicBenchmarkTransactions.ERC_1155_TRANSFER]: null,
					[BasicBenchmarkTransactions.ZKSYNC_USDC_TRANSFER]: null,
					[ComplexBenchmarkTransactions.USDC_APPROVAL]: null,
					[ComplexBenchmarkTransactions.AAVE_SUPPLY]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
					[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
						null,
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
							'Keycard Pal is an air-gapped signer that talks to a watch-only wallet over QR codes. By default it makes no network requests. It has no way to read existing token approvals from the chain, and it offers no swap or bridge.',
						label: 'Keycard Pal README',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20-L33',
					},
					{
						explanation:
							'The only online channel to apps accepts personal message and typed data signing requests only. The app has no screen for viewing approvals and no swap flow.',
						label: 'WalletConnect allowed methods',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/constants/walletConnect.ts#L1-L5',
					},
				],
				approvalsManagement: notSupported,
				builtInSwapApprovals: 'NO_BUILT_IN_SWAP',
			},
			transactionSubmission: {
				l1: {
					ref: [
						{
							explanation:
								'Keycard Pal only signs. Signatures are returned to the watch-only wallet as animated QR codes and that wallet broadcasts; Keycard Pal has no code path that broadcasts a transaction, and no peer-to-peer networking anywhere in the source code.',
							label: 'Keycard Pal README',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/README.md#L20-L22',
						},
						{
							explanation:
								'Over WalletConnect the app accepts only personal message and typed data signing requests. Requests to send a transaction are not supported, so the connected app always submits.',
							label: 'WalletConnect allowed methods',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/constants/walletConnect.ts#L1-L5',
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: notSupported,
				},
				l2: {
					ref: {
						explanation:
							'Keycard Pal signs for Optimism, Base and Arbitrum One, but it never submits transactions itself and has no force-inclusion or L1 escape-hatch flow.',
						label: 'Supported WalletConnect chains',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/constants/walletConnect.ts#L7-L13',
					},
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: notSupported,
				erc20L1Transfer: null,
				ethL1Transfer: null,
				uniswapUSDCToEtherSwap: null,
			},
			orderflowPractices: {
				disclosure: {
					ref: {
						explanation:
							'The signing review shows To, Chain, Amount, and gas fields; there is no orderflow, MEV or auction line, because the app only signs and never submits transactions.',
						label: 'Keycard Pal transaction review screen',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/src/components/SignRequestDetail/eth/SignRequestDetail.tsx#L85-L115',
					},
					afterSingleAction: OrderflowDisclosureLevel.NONE,
					byDefault: OrderflowDisclosureLevel.NONE,
				},
				practicesPage: notSupported,
				userCanRemoveAuctioning: notSupported,
			},
			releaseTransparency: {
				artifactSigning: supported<ArtifactSigningDetails>({
					ref: [
						{
							explanation:
								'CI decodes the developer release keystore from secrets, builds signed Android packages, and attaches them to the GitHub release along with a checksum file.',
							label: 'Android release workflow',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/.github/workflows/android-release.yml#L62-L126',
						},
						{
							explanation:
								'The F-Droid recipe pins the fingerprint of the developer signing certificate.',
							label: 'F-Droid recipe signing key pin',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/fdroiddata-com.keycardpal.yml#L114',
						},
					],
					publication: 'GITHUB_RELEASE',
					signer: 'DEVELOPER_KEY',
				}),
				dependencyLocking: supported({
					ref: {
						explanation:
							'Release builds install dependencies with a clean npm install, which fails unless the committed package-lock.json matches package.json.',
						label: 'Clean npm install in the release workflow',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/.github/workflows/android-release.yml#L43-L44',
					},
				}),
				dependencySandboxing: notSupported,
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: supported({
					ref: {
						explanation:
							'Keep a Changelog formatted release notes for every version, up to 1.14.0.',
						label: 'Keycard Pal CHANGELOG.md',
						url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/CHANGELOG.md',
					},
				}),
				hermeticBuilds: notSupported,
				repositoryChangeControls: null,
				reproducibleBuilds: supported({
					ref: [
						{
							explanation:
								'Release Android packages are byte-identical wherever they are built, so the F-Droid build can be verified against the developer build.',
							label: 'Contributing guide on byte-identical release builds',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/CONTRIBUTING.md#L58-L62',
						},
						{
							explanation:
								'Gradle script that strips machine-specific bytes (dev server IP, file paths) from release outputs.',
							label: 'Reproducible builds Gradle script',
							url: 'https://github.com/mmlado/keycard-pal/blob/9736572addde30b1b359c29a0cffd8510edb73cf/android/reproducible-builds.gradle#L1-L30',
						},
					],
				}),
			},
		},
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
