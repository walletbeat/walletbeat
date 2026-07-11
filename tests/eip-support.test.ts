import { describe, expect, it } from 'vitest'

import { eips } from '@/data/eips'
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { type EipSupport, walletEipSupport } from '@/schema/eip-support'
import type { EipNumber } from '@/schema/eips'
import { type ResolvedFeatures, resolveFeatures } from '@/schema/features'
import { AccountType } from '@/schema/features/account-support'
import { WalletProfile } from '@/schema/features/profile'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataLocation,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import {
	featureSupported,
	isMaybeSupported,
	isSupported,
	notSupported,
	supported,
} from '@/schema/features/support'
import { refs } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { BaseWallet } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

/** A resolved feature set where every feature is unknown. */
function unknownResolvedFeatures(): ResolvedFeatures {
	return {
		variant: Variant.BROWSER,
		type: WalletType.SOFTWARE,
		profile: WalletProfile.GENERIC,
		security: {
			scamAlerts: null,
			publicSecurityAudits: null,
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: null,
			transactionLegibility: null,
			passkeyVerification: null,
			bugBountyProgram: null,
			firmware: null,
			keysHandling: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			userSafety: null,
			accountRecovery: null,
			duressResistance: null,
		},
		privacy: {
			analytics: {
				usage: null,
				crashReports: null,
			},
			dataCollection: null,
			privacyPolicy: null,
			hardwarePrivacy: null,
			transactionPrivacy: null,
			appIsolation: null,
		},
		selfSovereignty: {
			transactionSubmission: null,
			interoperability: null,
			permissionsManagement: null,
		},
		transparency: {
			operationFees: null,
			orderflowPractices: null,
			reputation: null,
			maintenance: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
		},
		chainAbstraction: null,
		chainConfigurability: null,
		accountSupport: null,
		multiAddress: null,
		integration: {
			browser: 'NOT_A_BROWSER_WALLET',
		},
		walletCall: null,
		addressResolution: null,
		licensing: null,
		monetization: null,
		appConnectionSupport: null,
	}
}

function expectSupported(eipSupport: EipSupport): void {
	expect(eipSupport).not.toBeNull()

	if (eipSupport !== null) {
		expect(isSupported(eipSupport)).toBe(true)
	}
}

function expectNotSupported(eipSupport: EipSupport): void {
	expect(eipSupport).not.toBeNull()

	if (eipSupport !== null) {
		expect(isSupported(eipSupport)).toBe(false)
	}
}

function refUrls(eipSupport: EipSupport): string[] {
	if (eipSupport === null) {
		return []
	}

	return refs(eipSupport).flatMap(ref => ref.urls.map(url => url.url))
}

describe('walletEipSupport', () => {
	it('returns null for all EIPs when all features are unknown', () => {
		const eipSupport = walletEipSupport(unknownResolvedFeatures())

		for (const eipNumber of Object.keys(eips)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Iterating over the keys of a `Record<EipNumber, Eip>`.
			expect(eipSupport[eipNumber as EipNumber]).toBeNull()
		}
	})

	it('derives browser integration EIPs from the browser integration record', () => {
		const eipSupport = walletEipSupport({
			...unknownResolvedFeatures(),
			integration: {
				browser: {
					ref: { url: 'https://example.com/browser-integration' },
					'1193': featureSupported,
					'2700': notSupported,
					'6963': null,
				},
			},
		})

		expectSupported(eipSupport['1193'])
		expectNotSupported(eipSupport['2700'])
		expect(eipSupport['6963']).toBeNull()

		// The browser integration record's references apply to each browser EIP.
		expect(refUrls(eipSupport['1193'])).toContain('https://example.com/browser-integration')
		expect(refUrls(eipSupport['2700'])).toContain('https://example.com/browser-integration')
	})

	it('derives account abstraction EIPs from account support', () => {
		const eipSupport = walletEipSupport({
			...unknownResolvedFeatures(),
			accountSupport: {
				defaultAccountType: AccountType.eip7702,
				eoa: notSupported,
				mpc: notSupported,
				rawErc4337: notSupported,
				eip7702: supported({
					ref: { url: 'https://example.com/7702' },
					contract: 'UNKNOWN',
				}),
				safe: notSupported,
			},
		})

		expectSupported(eipSupport['7702'])
		expectNotSupported(eipSupport['4337'])

		// References attached to the account type support are preserved.
		expect(refUrls(eipSupport['7702'])).toContain('https://example.com/7702')
	})

	it('derives EIP-5792 from wallet call support', () => {
		const eipSupport = walletEipSupport({
			...unknownResolvedFeatures(),
			walletCall: supported({
				ref: { url: 'https://example.com/5792' },
				atomicMultiTransactions: featureSupported,
			}),
		})

		expectSupported(eipSupport['5792'])
		expect(refUrls(eipSupport['5792'])).toContain('https://example.com/5792')
	})

	it('derives EIP-712, ERC-7730 and ERC-8213 from software transaction legibility', () => {
		const eipSupport = walletEipSupport({
			...unknownResolvedFeatures(),
			security: {
				...unknownResolvedFeatures().security,
				transactionLegibility: {
					ref: { url: 'https://example.com/legibility' },
					erc8213: supported({
						calldataDisplay: {
							[CallDataDisplay.RAW_HEX]: DataDisplayOptions.SHOWN_OPTIONALLY,
							[CallDataDisplay.COPY_HEX_TO_CLIPBOARD]: DataDisplayOptions.NOT_IN_UI,
							[CallDataDisplay.FORMATTED]: DataDisplayOptions.NOT_IN_UI,
							[CallDataDisplay.CALLDATA_DIGEST]: DataDisplayOptions.NOT_IN_UI,
						},
						messageSigningLegibility: {
							[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.NOT_IN_UI,
							[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.NOT_IN_UI,
							[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
						},
					}),
					erc7730: supported({
						[ComplexBenchmarkTransactions.USDC_APPROVAL]: {
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
						[ComplexBenchmarkTransactions.AAVE_SUPPLY]: {
							decoded: DataDisplayOptions.NOT_IN_UI,
						},
						[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
						[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
							null,
						[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
					}),
					transactionSimulations: null,
					transactionDetailsDisplay: null,
				},
			},
		})

		// The wallet displays the decoded EIP-712 struct.
		expectSupported(eipSupport['712'])
		// The wallet does not display the calldata digest nor the EIP-712 digest.
		expectNotSupported(eipSupport['8213'])
		// The wallet claims ERC-7730 support but decodes none of the benchmark
		// transactions.
		expectNotSupported(eipSupport['7730'])

		// All three EIPs inherit the transaction legibility references.
		expect(refUrls(eipSupport['712'])).toContain('https://example.com/legibility')
		expect(refUrls(eipSupport['8213'])).toContain('https://example.com/legibility')
		expect(refUrls(eipSupport['7730'])).toContain('https://example.com/legibility')
	})

	it('derives ERC-7730 from hardware transaction legibility', () => {
		const eipSupport = walletEipSupport({
			...unknownResolvedFeatures(),
			variant: Variant.HARDWARE,
			type: WalletType.HARDWARE,
			security: {
				...unknownResolvedFeatures().security,
				transactionLegibility: {
					ref: { url: 'https://example.com/hardware-legibility' },
					erc8213: null,
					erc7730: supported({
						[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
						[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.NOT_PROVIDED,
						[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.NOT_PROVIDED,
						[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
							DataLocation.NOT_PROVIDED,
						[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
							DataLocation.NOT_PROVIDED,
					}),
					detailsDisplayed: null,
					dataExtraction: null,
				},
			},
		})

		// The wallet decodes at least one benchmark transaction on-device.
		expectSupported(eipSupport['7730'])
		// The ERC-8213 data was not assessed.
		expect(eipSupport['8213']).toBeNull()
		expect(eipSupport['712']).toBeNull()
	})

	describe('handles all wallets', () => {
		// TODO: Add embedded wallets here once we have some.
		const walletMaps: Array<[string, Record<string, BaseWallet<string>>]> = [
			['software wallets', softwareWallets],
			['hardware wallets', hardwareWallets],
		]

		for (const [title, walletMap] of walletMaps) {
			describe(title, () => {
				for (const walletName in walletMap) {
					const wallet = walletMap[walletName]

					it(`derives EIP support for all variants of ${walletName}`, () => {
						for (const variant of Object.values(Variant)) {
							if (wallet.variants[variant] !== true) {
								continue
							}

							const eipSupport = walletEipSupport(
								resolveFeatures(wallet.features, wallet.variants, variant),
							)

							// One entry per tracked EIP, each either unknown or a
							// reference-annotated Support value.
							expect(Object.keys(eipSupport).sort()).toEqual(Object.keys(eips).sort())

							for (const support of Object.values(eipSupport)) {
								if (support !== null) {
									expect(isMaybeSupported(support)).toBe(true)
									expect(Object.hasOwn(support, 'ref')).toBe(true)
								}
							}
						}
					})
				}
			})
		}
	})
})
