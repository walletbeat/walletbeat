import { cardiE } from '@/data/contributors/0xcardie'
import type { SoftwareWallet } from '@/data/software-wallets'
import { AccountType } from '@/schema/features/account-support'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { WalletProfile } from '@/schema/features/profile'
import {
	BasicUnlockMechanism,
	BasicUnlockMechanismSupport,
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
import { UnlimitedApprovalWarningBenchmarkSpenders } from '@/schema/features/security/scam-alerts'
import {
	KeyStorageMechanism,
	SecureRngSource,
} from '@/schema/features/security/security-best-practices'
import { DataDisplayOptions } from '@/schema/features/security/transaction-legibility'
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability'
import {
	BuiltInSwapDefaultApprovalBehavior,
	SpendingApprovalsControl,
} from '@/schema/features/self-sovereignty/permissions-management'
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
import {
	FeeDisplayLevel,
	FeeType,
	WalletServiceFeeDisplayUnit,
} from '@/schema/features/transparency/fee-display'
import { FOSSLicense, LicensingType } from '@/schema/features/transparency/license'
import { Variant } from '@/schema/variants'
import { parseBrowserExtensionManifest } from '@/tools/manifest-collector/browser-ext-manifest-parser'
import { nonEmptySet } from '@/types/utils/non-empty'

import wallet1337RawExtManifest from './manifests/wallet1337/ggdidobiifdhehiigbcjiddeeadklmhl.manifest.json'

const COMMIT = 'fd1d34886747aefe3f9943aab38a8cacd506c5d1'

/** Blob URL for a line range on the public 1337 commit this entry was written from. */
function blob(path: string, lines: string): string {
	return `https://github.com/0xCardiE/1337-wallet/blob/${COMMIT}/${path}#${lines}`
}

const feeUnits = nonEmptySet<WalletServiceFeeDisplayUnit>(WalletServiceFeeDisplayUnit.TOKEN_AMOUNT)

/**
 * Confirm sheet shows one network-fee amount in the native token.
 * Custom opens max fee, priority fee, and gas limit for that same fee.
 * 1337 does not add a wallet fee.
 */
function networkFee(explanation: string, url: string, onchainAppFee: boolean) {
	return supported({
		ref: [{ explanation, url }],
		fees: {
			feesInvolved: {
				[FeeType.NETWORK_FEE]: true,
				[FeeType.ONCHAIN_APP_FEE]: onchainAppFee,
				[FeeType.WALLET_FEE]: false,
			},
			shownAfterSingleAction: {
				comprehensiveness: FeeDisplayLevel.AGGREGATED,
				units: feeUnits,
			},
			shownByDefault: {
				comprehensiveness: FeeDisplayLevel.AGGREGATED,
				units: feeUnits,
			},
		},
	})
}

export const wallet1337: SoftwareWallet = {
	metadata: {
		id: 'wallet1337',
		displayName: '1337',
		tableName: '1337',
		// Not checked against the Coinspect wallet-maker list.
		coinspectId: null,
		contributors: [cardiE],
		iconExtension: 'png',
		lastUpdated: '2026-11-20',
		urls: {
			docs: [
				'https://1337wallet.io/security',
				'https://github.com/0xCardiE/1337-wallet/blob/main/README.md',
			],
			extensions: [
				'https://chromewebstore.google.com/detail/1337-wallet/ggdidobiifdhehiigbcjiddeeadklmhl',
			],
			repositories: ['https://github.com/0xCardiE/1337-wallet'],
			socials: {
				discord: 'https://discord.gg/ZgADAzAKFd',
				x: 'https://x.com/1337wallet',
			},
			websites: ['https://1337wallet.io/'],
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
							"New software accounts are a 12-word English BIP-39 phrase or a viem private key, derived on the BIP-44 Ethereum path m/44'/60'/0'/0/index. The phrase or generated key is shown once at creation. There is no later screen that reveals the seed or private key.",
						label: '1337 key generation and derivation path',
						url: blob('src/lib/walletCore.ts', 'L13-L32'),
					},
					{
						explanation:
							'The creation screen says the seed phrase will not be shown again, and that a generated private key is shown only that once.',
						label: '1337 one-time backup screen',
						url: blob('src/ui/Onboarding.tsx', 'L90-L101'),
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
						"Inspect and account labels resolve a .eth name with viem against the user's Ethereum RPC. The send field takes a hex address, which is the check this rating uses, so send-field ENS resolution is not supported. ERC-7828 and ERC-7831 forms are not resolved.",
					label: '1337 ENS lookup through the configured Ethereum RPC',
					url: blob('src/lib/ens.ts', 'L57-L81'),
				},
			],
			chainSpecificAddressing: {
				erc7828: notSupported,
				erc7831: notSupported,
			},
			nonChainSpecificEnsResolution: notSupported,
		},
		chainAbstraction: null,
		chainConfigurability: supported({
			ref: [
				{
					explanation:
						'Ethereum mainnet ships with public RPC URLs and the wallet calls the selected RPC for balances and sends. The user can replace that URL. This was read from the source. It was not packet-captured on a fresh install, so it is not claimed that the RPC can be set before any default request.',
					label: '1337 default Ethereum RPC list',
					url: blob('src/lib/chainCatalog.ts', 'L29-L40'),
				},
				{
					explanation:
						'Networks has an Add chain form. A balances screen also accepts an ERC-20 contract address and reads balanceOf through the configured RPC. Native balance is eth_getBalance. Sends are eth_sendRawTransaction to that same RPC. Account create and import stay on the device. These paths were not re-run in a network where only a self-hosted node was reachable.',
					label: '1337 add-chain control',
					url: blob('src/ui/NetworksManageView.tsx', 'L426-L464'),
				},
			],
			customChainRpcEndpoint: featureSupported,
			l1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
				withNoConnectivityExceptL1RPCEndpoint: {
					accountCreation: featureSupported,
					accountImport: featureSupported,
					erc20BalanceLookup: featureSupported,
					erc20TokenSend: featureSupported,
					etherBalanceLookup: featureSupported,
				},
			}),
			nonL1: supported({
				rpcEndpointConfiguration: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
			}),
		}),
		ecosystem: {
			delegation: 'EIP_7702_NOT_SUPPORTED',
		},
		integration: {
			browser: {
				ref: [
					{
						explanation:
							'The injected provider implements EIP-1193 request(). It has not been run through https://walletbeat.eth.limo/test/ for this entry.',
						label: '1337 injected provider',
						url: blob('src/inpage/provider.ts', 'L1-L2'),
					},
					{
						explanation:
							'The provider emits chainChanged, accountsChanged, connect, and disconnect, and exposes on, addListener, removeListener, off, and once.',
						label: '1337 provider events',
						url: blob('src/inpage/provider.ts', 'L68-L121'),
					},
					{
						explanation:
							'The provider announces itself with eip6963:announceProvider and answers eip6963:requestProvider. It also sets isMetaMask so older apps can find it.',
						label: '1337 EIP-6963 announcement',
						url: blob('src/inpage/provider.ts', 'L275-L314'),
					},
				],
				'1193': featureSupported,
				'2700': featureSupported,
				'6963': featureSupported,
			},
		},
		licensing: {
			type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
			walletAppLicense: {
				ref: [
					{
						explanation:
							'The extension repository is MIT licensed. That repository is what builds the extension.',
						label: '1337 MIT license',
						url: blob('LICENSE', 'L1-L21'),
					},
				],
				license: FOSSLicense.MIT,
			},
		},
		monetization: {
			ref: [
				{
					explanation:
						'The public site has a donate section and a published donation address. No revenue breakdown, funding round, grant, token, or wallet fee schedule is published. Those strategies are left unrated rather than marked absent.',
					label: '1337 donation address',
					url: blob('website/src/lib/site.ts', 'L1-L15'),
				},
			],
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: true,
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
		multiAddress: supported({
			ref: [
				{
					explanation:
						'The accounts panel holds seed accounts, an imported private key, Ledger, and Trezor, and the user picks the active one.',
					label: '1337 accounts panel',
					url: blob('src/ui/AccountsPanel.tsx', 'L167-L172'),
				},
			],
		}),
		privacy: {
			analytics: {
				crashReports: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The privacy policy says there is no analytics SDK and no tracking server. No crash-reporting library is in the extension.',
							label: '1337 privacy policy source',
							url: blob('website/src/app/privacy/page.tsx', 'L30-L40'),
						},
					],
				}),
				usage: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The privacy policy says there is no analytics SDK. The extension does not ship a product-analytics library.',
							label: '1337 privacy policy source',
							url: blob('website/src/app/privacy/page.tsx', 'L30-L40'),
						},
					],
				}),
			},
			appIsolation: {
				[Variant.BROWSER]: {
					createInAppConnectionFlow: notSupported,
					erc7846WalletConnect: notSupported,
					ethAccounts: supported({
						ref: [
							{
								explanation:
									'eth_accounts and eth_requestAccounts return only the active unlocked address. A locked wallet rejects eth_requestAccounts. Connecting does not offer to create a fresh address, and it does not remember a different account per site.',
								label: '1337 eth_accounts handler',
								url: blob('src/lib/providerRpc.ts', 'L202-L218'),
							},
						],
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					useAppSpecificLastConnectedAddresses: notSupported,
				},
			},
			// Third parties exist (the user\'s RPC, optional explorer key, LI.FI quotes, price icons). They were not captured as a data-collection matrix.
			dataCollection: null,
			privacyPolicy: 'https://1337wallet.io/privacy',
			transactionPrivacy: {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				[PrivateTransferTechnology.PRIVACY_POOLS]: notSupported,
				[PrivateTransferTechnology.RAILGUN]: notSupported,
				[PrivateTransferTechnology.STEALTH_ADDRESSES]: notSupported,
				[PrivateTransferTechnology.TORNADO_CASH_NOVA]: notSupported,
			},
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: {
				drills: notSupported,
				guardianRecovery: notSupported,
			},
			bugBountyProgram: notSupported,
			duressResistance: {
				basicUnlock: {
					ref: [
						{
							explanation:
								'Unlock asks for the password. The vault is PBKDF2 plus AES-GCM. There is no PIN, biometric, pattern, or separate duress credential. Auto-lock exists and is off by default; a password is still required to unlock.',
							label: '1337 password unlock',
							url: blob('src/ui/Unlock.tsx', 'L51-L64'),
						},
					],
					mechanisms: {
						[BasicUnlockMechanism.BIOMETRIC]: notSupported,
						[BasicUnlockMechanism.PASSWORD]: supported({
							type: BasicUnlockMechanismSupport.REQUIRED,
						}),
						[BasicUnlockMechanism.PATTERN]: notSupported,
						[BasicUnlockMechanism.PIN]: notSupported,
					},
				},
				duressMode: notSupported,
			},
			hardwareWalletSupport: {
				ref: [
					{
						explanation:
							'Ledger uses the browser WebHID transport. Trezor uses the Trezor Connect popup (coreMode popup) at connect.trezor.io, not a WebHID session inside the extension. The connection type is recorded as WebUSB because that popup is a browser connection. No other hardware brands are wired up.',
						label: '1337 Ledger WebHID transport',
						url: blob('src/lib/ledger.ts', 'L1-L4'),
					},
					{
						explanation: 'Trezor Connect is initialized in popup mode against connect.trezor.io.',
						label: '1337 Trezor Connect popup',
						url: blob('src/lib/trezorBackground.ts', 'L1-L26'),
					},
				],
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webHID],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.webUSB],
					}),
				},
			},
			keysHandling: {
				ref: [
					{
						explanation:
							'The seed or private key is generated in the extension and stored only in the local encrypted vault. Signing does not send key material to a 1337 server. There is no key share and no remote signer.',
						label: '1337 local vault',
						url: blob('src/lib/vault.ts', 'L1-L8'),
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
				contractTransactionWarning: notSupportedWithRef({
					ref: [
						{
							explanation:
								'There is no scam-contract registry, no "first time you call this contract" warning, and no newly-deployed-contract warning. The confirm sheet does flag an unknown function selector, contract creation, and a few local contract-danger hints. Those are not this warning.',
							label: '1337 local approval risk flags',
							url: blob('src/lib/txRisk.ts', 'L331-L339'),
						},
					],
				}),
				scamUrlWarning: notSupportedWithRef({
					ref: [
						{
							explanation:
								'1337 does not check a phishing or scam-site list. The confirm sheet shows the requesting hostname.',
							label: '1337 privacy policy: no tracking server',
							url: 'https://1337wallet.io/privacy',
						},
					],
				}),
				sendTransactionWarning: notSupportedWithRef({
					ref: [
						{
							explanation:
								'There is no address book whitelist, no first-time recipient warning, and no look-alike address check.',
							label: '1337 local approval risk flags',
							url: blob('src/lib/txRisk.ts', 'L331-L339'),
						},
					],
				}),
				unlimitedApprovalWarning: supported({
					ref: [
						{
							explanation:
								'Unlimited ERC-20 approvals and setApprovalForAll are flagged locally in the confirm sheet. The flag does not call an external service. The pinned WalletBeat spender benchmarks were not executed, so each spender below is unrated.',
							label: '1337 unlimited-approval flag',
							url: blob('src/lib/txRisk.ts', 'L331-L335'),
						},
					],
					leaksSpenderAddress: false,
					leaksUserAddress: false,
					leaksUserIp: false,
					warnsOnUnlimitedApproval: {
						[UnlimitedApprovalWarningBenchmarkSpenders.CONTRACT_NOT_INTERACTED_BEFORE]: null,
						[UnlimitedApprovalWarningBenchmarkSpenders.PINK_PHISHING_ADDRESS]: null,
						[UnlimitedApprovalWarningBenchmarkSpenders.PUBLIC_EOA]: null,
						[UnlimitedApprovalWarningBenchmarkSpenders.RECENTLY_DEPLOYED_CONTRACT]: null,
						[UnlimitedApprovalWarningBenchmarkSpenders.UNISWAP_V3_ROUTER]: null,
					},
				}),
			},
			securityBestPractices: {
				browser: {
					ref: [
						{
							explanation:
								'The vault encrypts keys with PBKDF2 (210,000 iterations) and AES-GCM. The password is the user secret.',
							label: '1337 vault encryption',
							url: blob('src/lib/vault.ts', 'L1-L8'),
						},
						{
							explanation:
								'Mnemonic and private-key generation go through viem, which uses the platform CSPRNG in the browser. The vault salt and IV come from crypto.getRandomValues.',
							label: '1337 local key generation',
							url: blob('src/lib/walletCore.ts', 'L13-L19'),
						},
						{
							explanation:
								'Manifest V3. host_permissions and the broad content scripts are <all_urls>. externally_connectable is only https://*.trezor.io/* and https://connect.trezor.io/*, with no extension ids. There is no web_accessible_resources entry. Declared permissions are storage, sidePanel, and scripting. The schema has no "specific HTTPS hosts" value, so the Trezor matches are recorded as HTTPS-only and are narrower than every HTTPS origin.',
							label: '1337 extension manifest',
							url: blob('public/manifest.json', 'L28-L53'),
						},
					],
					browserExtensionHardening: parseBrowserExtensionManifest(wallet1337RawExtManifest),
					keyStorageMechanism: KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
					secureRng: SecureRngSource.OS_CSPRNG,
				},
				desktop: 'NOT_A_DESKTOP_APP',
				mobile: 'NOT_A_MOBILE_APP',
			},
			transactionLegibility: supported({
				ref: [
					{
						explanation:
							'The confirm sheet shows the chain name and chain id, a human headline, and a local eth_call simulation result (succeeded, would fail, or could not simulate). It does not show an asset-diff. Overview and Gas & nonce start open and include from, to, value, chain id, and nonce after the RPC preview. Calldata and the raw request start collapsed. SIWE domain, URI, chain, and address mismatches are called out. ERC-7730 and ERC-8213 were not implemented, and the simulation benchmark matrix was not run.',
						label: '1337 confirm sheet chain line',
						url: blob('src/ui/TxApprovalSheet.tsx', 'L1170-L1206'),
					},
					{
						explanation:
							'Default-open sections are Overview and Gas & nonce. Calldata is present but collapsed.',
						label: '1337 confirm detail sections',
						url: blob('src/lib/approvalDetails.ts', 'L482-L487'),
					},
				],
				erc4361: supported({
					ref: [
						{
							explanation:
								'A SIWE message with a domain, URI, chain, or address that does not match the requesting site is explained on the confirm sheet.',
							label: '1337 SIWE mismatch copy',
							url: blob('src/ui/TxApprovalSheet.tsx', 'L549-L566'),
						},
					],
				}),
				erc7730: null,
				erc8213: null,
				transactionDetailsDisplay: {
					chain: DataDisplayOptions.SHOWN_BY_DEFAULT,
					from: DataDisplayOptions.SHOWN_BY_DEFAULT,
					gas: DataDisplayOptions.SHOWN_BY_DEFAULT,
					nonce: DataDisplayOptions.SHOWN_BY_DEFAULT,
					to: DataDisplayOptions.SHOWN_BY_DEFAULT,
					value: DataDisplayOptions.SHOWN_BY_DEFAULT,
				},
				transactionSimulations: null,
			}),
		},
		selfSovereignty: {
			permissionsManagement: {
				ref: [
					{
						explanation:
							"The approvals screen lists ERC-20 allowances and NFT setApprovalForAll approvals and can revoke them. Contracts that do not answer the approval calls are skipped. ERC-721 and ERC-1155 share that isApprovedForAll path. Permit2 allowances can also be revoked. The built-in swap asks LI.FI for a quote and, when an approval is needed, approves the quote's from-amount rather than the maximum uint256.",
						label: '1337 revoke buttons',
						url: blob('src/ui/ApprovalsPanel.tsx', 'L1-L12'),
					},
					{
						explanation:
							'ensureErc20Allowance approves minAmount, which the swap sets to the quote spend.',
						label: '1337 exact swap allowance',
						url: blob('src/lib/ethereum.ts', 'L675-L707'),
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
					ref: [
						{
							explanation:
								'Signed transactions are sent with eth_sendRawTransaction to the RPC the user selected, including a self-hosted node if that is the configured URL. There is no devp2p or other direct gossip client. This was not confirmed with a packet capture.',
							label: '1337 raw transaction broadcast',
							url: blob('src/lib/ethereum.ts', 'L357-L362'),
						},
					],
					selfBroadcastViaDirectGossip: notSupported,
					selfBroadcastViaSelfHostedNode: featureSupported,
				},
				l2: {
					ref: [
						{
							explanation:
								'Arbitrum and OP Stack networks such as Optimism and Base are in the default chain list and use their own RPC URLs. There is no force-inclusion or delayed-inbox flow.',
							label: '1337 default Arbitrum and Optimism entries',
							url: blob('src/lib/chainCatalog.ts', 'L65-L90'),
						},
					],
					[TransactionSubmissionL2Type.arbitrum]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
					[TransactionSubmissionL2Type.opStack]:
						TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
				},
			},
		},
		transparency: {
			operationFees: {
				builtInErc20Swap: networkFee(
					'The built-in swap quotes through LI.FI. A route can include a protocol fee inside the quoted output. The confirm sheet shows one network fee in the native token and does not add a 1337 fee. Opening Custom shows max fee, priority fee, and gas limit for that network fee. The protocol fee is not its own line.',
					blob('src/ui/TxApprovalSheet.tsx', 'L901-L912'),
					true,
				),
				erc20L1Transfer: networkFee(
					'An ERC-20 send uses the same confirm sheet. The user sees one network fee in the native token. 1337 does not add a fee. Opening Custom shows max fee, priority fee, and gas limit.',
					blob('src/lib/approvalDetails.ts', 'L400-L417'),
					false,
				),
				ethL1Transfer: networkFee(
					'An ETH send uses the confirm sheet. The user sees one network fee in the native token. 1337 does not add a fee. Opening Custom shows max fee, priority fee, and gas limit.',
					blob('src/lib/approvalDetails.ts', 'L400-L417'),
					false,
				),
				uniswapUSDCToEtherSwap: networkFee(
					'A Uniswap app swap is a normal contract transaction. The confirm sheet shows one network fee in the native token. It does not itemize the Uniswap pool fee, and 1337 does not add a fee. Opening Custom shows max fee, priority fee, and gas limit.',
					blob('src/ui/TxApprovalSheet.tsx', 'L901-L912'),
					true,
				),
			},
			orderflowPractices: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyAgeGate: null,
				dependencyLocking: supported({
					ref: [
						{
							explanation:
								'The repository has a package-lock.json. GitHub Actions installs with npm ci, which fails if the lockfile does not match package.json.',
							label: '1337 CI npm ci',
							url: blob('.github/workflows/test.yml', 'L17-L31'),
						},
					],
				}),
				dependencySandboxing: notSupportedWithRef({
					ref: [
						{
							explanation:
								'The background webpack build is wrapped with LavaMoat and SES lockdown. The injected inpage and content bundles are outside that sandbox, so the release as a whole does not isolate every dependency. See the project TODO.',
							label: '1337 LavaMoat webpack build',
							url: blob('webpack.config.cjs', 'L1-L9'),
						},
						{
							explanation:
								'The project TODO says the content and inpage bundles stay outside LavaMoat.',
							label: '1337 LavaMoat coverage note',
							url: blob('TODO.md', 'L22-L23'),
						},
					],
				}),
				dependencyVulnerabilityScanning: notSupported,
				hasPublicChangelog: notSupported,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		walletCall: notSupportedWithRef({
			ref: [
				{
					explanation:
						'wallet_getCapabilities returns an empty object per chain. wallet_sendCalls is not implemented. Empty capabilities are intentional so the wallet does not advertise atomic batching.',
					label: '1337 EIP-5792 capabilities',
					url: blob('src/lib/walletCapabilities.ts', 'L1-L11'),
				},
			],
		}),
	},
	variants: {
		[Variant.BROWSER]: true,
	},
}
