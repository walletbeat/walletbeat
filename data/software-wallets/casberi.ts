import { alexanderchopan } from '@/data/contributors/alexanderchopan'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import {
	KeyGenerationLocation,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import {
	IosUsageDescription,
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
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
		accountSupport: {
			defaultAccountType: AccountType.safe,
			eip7702: notSupported,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: supported({
				ref: [
					{
						explanation:
							'The Safe is set up with the Safe 4337 module as module and fallback handler. Every send is an ERC-4337 user operation for the entry point contract at version 0.7.',
						label: 'Safe 4337 module and entry point used by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccount.swift#L3-L76`,
					},
					{
						explanation:
							'The account pays its own gas in ETH. On Base it can instead pay gas in its own USDC through the Circle paymaster contract, which is called onchain and needs no service request.',
						label: 'Circle paymaster for gas in USDC on Base',
						url: 'https://github.com/alexanderchopan/casberi/blob/05cc3fcfb91e773fa3e8c2c8060565cf6213a95e/Casberi/Casberi/Model/YourAccountOp.swift#L30-L44',
					},
				],
				contract: {
					name: 'Safe 1.4.1 (SafeL2) with Safe4337Module 0.3.0',
					address: '0x29fcb43b46531bca003ddc8fcb67ffe91900c762',
					eip7702Delegatable: false,
					methods: {
						isValidSignature: featureSupported,
						validateUserOp: featureSupported,
					},
					sourceCode: {
						ref: 'https://github.com/safe-fndn/safe-smart-account/blob/bf943f80fec5ac647159d26161446ac5d716a294/contracts/SafeL2.sol#not-line-specific',
						available: true,
					},
				},
				controllingSharesInSelfCustodyByDefault: 'YES',
				keyRotationTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				tokenTransferTransactionGeneration:
					TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
			}),
			safe: supported({
				ref: [
					{
						explanation:
							'The account is a Safe 1.4.1 behind the Safe proxy factory, with the Safe 4337 module as module and fallback handler. The address is computed on the device and the first send on each network deploys the Safe.',
						label: 'Safe contracts and setup used by the account',
						url: `${source}/Casberi/Casberi/Model/YourAccount.swift#L3-L76`,
					},
					{
						explanation:
							'Owner changes are built on the device as Safe owner calls. A cosigner or an outside key is added with `addOwnerWithThreshold`, and a required cosigner raises the threshold to 2.',
						label: 'Owner and threshold changes built on the device',
						url: `${source}/Casberi/Casberi/Model/YourAccountOp.swift#L446-L463`,
					},
				],
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
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
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
		multiAddress: featureSupported,
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
			hardwareWalletSupport: {
				ref: refTodo,
				wallets: {
					[HardwareWalletType.LEDGER]: notSupported,
					[HardwareWalletType.TREZOR]: notSupported,
					[HardwareWalletType.GRIDPLUS]: notSupported,
					[HardwareWalletType.KEYSTONE]: notSupported,
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The signing key is a P-256 key made inside the Secure Enclave of the phone. It is stored for this device only, behind the device passcode and the enrolled biometrics, and is not synced.',
						label: 'Secure Enclave key generation and storage',
						url: `${source}/Casberi/Casberi/Model/YourAccountKey.swift#L135-L165`,
					},
					{
						explanation:
							'The recovery key is a second P-256 key made on the device with `CryptoKit`. It is stored in iCloud Keychain and signing with it asks for device owner authentication.',
						label: 'Recovery key generation and storage',
						url: `${source}/Casberi/Casberi/Model/YourAccountRecovery.swift#L28-L108`,
					},
				],
				keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
				multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
			},
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: supported({
				ref: [
					{
						explanation:
							'The phone signs with a Secure Enclave P-256 key and builds the WebAuthn authenticator data itself, with no passkey API and no relying party. The signature is verified on chain by the Safe WebAuthn signer contracts, which call the RIP-7212 precompile first and the Daimo P-256 verifier as fallback.',
						label: 'WebAuthn signature built on the device and its onchain verifiers',
						url: `${source}/Casberi/Casberi/Model/SafeWebAuthnSignature.swift#L17-L50`,
					},
				],
				details:
					'Safe WebAuthn shared signer at 0x94a4F6affBd8975951142c3999aEAB7ecee555c2. Verifiers are the RIP-7212 precompile at 0x100, then the Daimo P-256 verifier at 0xc2b78104907F722DABAc4C69f826a522B2754De4.',
				library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
				libraryUrl: 'https://github.com/daimo-eth/p256-verifier',
			}),
			publicSecurityAudits: null,
			scamAlerts: null,
			securityBestPractices: {
				browser: 'NOT_A_BROWSER_EXTENSION',
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: {
					ref: [
						{
							explanation:
								'The signing key is created by the Secure Enclave and never leaves it. The app stores only the wrapped key blob, for this device only and only while a passcode is set.',
							label: 'Secure Enclave key creation',
							url: `${source}/Casberi/Casberi/Model/YourAccountKey.swift#L135-L165`,
						},
					],
					keyStorageMechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
					mobileAppHardening: {
						android: 'NOT_AN_ANDROID_APP',
						ios: {
							usageDescriptions: [
								IosUsageDescription.CAMERA,
								IosUsageDescription.FACE_ID,
								IosUsageDescription.MICROPHONE,
								IosUsageDescription.PHOTO_LIBRARY,
							],
						},
					},
					secureRng: SecureRngSource.HARDWARE_ENTROPY,
				},
			},
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
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
		walletCall: notSupported,
	},
	variants: {
		[Variant.MOBILE]: true,
	},
}
