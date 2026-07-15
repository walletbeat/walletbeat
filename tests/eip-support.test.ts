import { describe, expect, it } from 'vitest'

import { eips } from '@/data/eips'
import { unratedHardwareTemplate } from '@/data/hardware-wallets/unrated.tmpl'
import { unratedTemplate } from '@/data/software-wallets/unrated.tmpl'
import type { SmartWalletContract } from '@/schema/contracts'
import { type EipSupport, walletEipSupport } from '@/schema/eip-support'
import { type ResolvedFeatures, resolveFeatures } from '@/schema/features'
import {
	type AccountSupport,
	AccountType,
	TransactionGenerationCapability,
} from '@/schema/features/account-support'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataDisplayOptions,
	DataLocation,
	MessageSigningDetails,
} from '@/schema/features/security/transaction-legibility'
import {
	featureSupported,
	isSupported,
	notSupported,
	type Support,
	supported,
} from '@/schema/features/support'
import { refs } from '@/schema/reference'
import { Variant } from '@/schema/variants'

/** Resolved features of the unrated software wallet template. */
function unratedFeatures(): ResolvedFeatures {
	return resolveFeatures(unratedTemplate.features, unratedTemplate.variants, Variant.BROWSER)
}

/** Resolved features of the unrated hardware wallet template. */
function unratedHardwareFeatures(): ResolvedFeatures {
	return resolveFeatures(
		unratedHardwareTemplate.features,
		unratedHardwareTemplate.variants,
		Variant.HARDWARE,
	)
}

function expectSupported(eipSupport: EipSupport): void {
	expect(eipSupport).not.toBe('UNKNOWN')
	expect(eipSupport).not.toBe('NOT_APPLICABLE')

	if (typeof eipSupport !== 'string') {
		expect(isSupported(eipSupport)).toBe(true)
	}
}

function expectNotSupported(eipSupport: EipSupport): void {
	expect(eipSupport).not.toBe('UNKNOWN')
	expect(eipSupport).not.toBe('NOT_APPLICABLE')

	if (typeof eipSupport !== 'string') {
		expect(isSupported(eipSupport)).toBe(false)
	}
}

function refUrls(eipSupport: EipSupport): string[] {
	if (typeof eipSupport === 'string') {
		return []
	}

	return refs(eipSupport).flatMap(ref => ref.urls.map(url => url.url))
}

describe('walletEipSupport', () => {
	it('returns UNKNOWN for all EIPs when the wallet is unrated', () => {
		const eipSupport = walletEipSupport(unratedFeatures())

		for (const eipNumber of Object.keys(eips)) {
			expect(eipSupport[eipNumber]).toBe('UNKNOWN')
		}
	})

	it('marks browser integration EIPs as not applicable for non-browser wallets', () => {
		const eipSupport = walletEipSupport(unratedHardwareFeatures())

		expect(eipSupport['1193']).toBe('NOT_APPLICABLE')
		expect(eipSupport['2700']).toBe('NOT_APPLICABLE')
		expect(eipSupport['6963']).toBe('NOT_APPLICABLE')
	})

	it('derives browser integration EIPs from the browser integration record', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
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
		expect(eipSupport['6963']).toBe('UNKNOWN')

		// The browser integration record's references apply to each browser EIP.
		expect(refUrls(eipSupport['1193'])).toContain('https://example.com/browser-integration')
		expect(refUrls(eipSupport['2700'])).toContain('https://example.com/browser-integration')
	})

	it('derives ERC-4337 from raw ERC-4337 account support', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			accountSupport: {
				defaultAccountType: AccountType.rawErc4337,
				eoa: notSupported,
				mpc: notSupported,
				rawErc4337: supported({
					ref: { url: 'https://example.com/4337' },
					contract: 'UNKNOWN',
					controllingSharesInSelfCustodyByDefault: 'YES',
					tokenTransferTransactionGeneration:
						TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
					keyRotationTransactionGeneration:
						TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
				}),
				eip7702: notSupported,
				safe: notSupported,
			},
		})

		expectSupported(eipSupport['4337'])
		expectNotSupported(eipSupport['7702'])

		// References attached to the account type support are preserved.
		expect(refUrls(eipSupport['4337'])).toContain('https://example.com/4337')
	})

	/** Account support for an EIP-7702-only wallet with the given delegate. */
	function eip7702AccountSupport(contract: 'UNKNOWN' | SmartWalletContract): AccountSupport {
		return {
			defaultAccountType: AccountType.eip7702,
			eoa: notSupported,
			mpc: notSupported,
			rawErc4337: notSupported,
			eip7702: supported({
				ref: { url: 'https://example.com/7702' },
				contract,
			}),
			safe: notSupported,
		}
	}

	/** An EIP-7702 delegate contract with the given ERC-4337 support. */
	function delegateContract(validateUserOp: Support): SmartWalletContract {
		return {
			name: 'Example delegate',
			address: '0x0000000000000000000000000000000000000001',
			eip7702Delegatable: true,
			sourceCode: { available: false },
			methods: {
				isValidSignature: featureSupported,
				validateUserOp,
			},
		}
	}

	it('credits ERC-4337 when the EIP-7702 delegate is an ERC-4337 account', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			accountSupport: eip7702AccountSupport(delegateContract(featureSupported)),
		})

		expectSupported(eipSupport['7702'])
		expect(refUrls(eipSupport['7702'])).toContain('https://example.com/7702')

		// The delegate contract implements validateUserOp, so the wallet
		// supports ERC-4337 accounts, backed by the EIP-7702 references.
		expectSupported(eipSupport['4337'])
		expect(refUrls(eipSupport['4337'])).toContain('https://example.com/7702')
	})

	it('leaves ERC-4337 unknown when the EIP-7702 delegate contract is unknown', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			accountSupport: eip7702AccountSupport('UNKNOWN'),
		})

		expectSupported(eipSupport['7702'])

		// EIP-7702 alone does not imply ERC-4337: the unknown delegate
		// contract may or may not be an ERC-4337 account.
		expect(eipSupport['4337']).toBe('UNKNOWN')
	})

	it('does not credit ERC-4337 when the EIP-7702 delegate is not an ERC-4337 account', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			accountSupport: eip7702AccountSupport(delegateContract(notSupported)),
		})

		expectSupported(eipSupport['7702'])

		// The delegate contract was verified not to implement validateUserOp,
		// and the wallet supports no raw ERC-4337 accounts.
		expectNotSupported(eipSupport['4337'])
	})

	it('derives EIP-5792 from wallet call support', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			walletCall: supported({
				ref: { url: 'https://example.com/5792' },
				atomicMultiTransactions: featureSupported,
			}),
		})

		expectSupported(eipSupport['5792'])
		expect(refUrls(eipSupport['5792'])).toContain('https://example.com/5792')
	})

	it('derives EIP-5792 regardless of atomic multi-transaction support', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			walletCall: supported({
				ref: { url: 'https://example.com/5792' },
				atomicMultiTransactions: notSupported,
			}),
		})

		// The wallet implements the EIP-5792 wallet call API, even though it
		// does not support the atomic capability.
		expectSupported(eipSupport['5792'])
	})

	it('derives EIP-712, ERC-7730, ERC-4361, and ERC-8213 from software transaction legibility', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			security: {
				...unratedFeatures().security,
				transactionLegibility: {
					ref: { url: 'https://example.com/legibility' },
					erc4361: { ...featureSupported, ref: { url: 'https://example.com/4361' } },
					erc8213: supported({
						ref: { url: 'https://example.com/8213' },
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
						ref: { url: 'https://example.com/7730' },
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
		// The wallet supports ERC-4361.
		expectSupported(eipSupport['4361'])
		// The wallet claims ERC-7730 support but was verified not to decode some
		// of the benchmark transactions.
		expectNotSupported(eipSupport['7730'])
		// The wallet does not display the calldata digest nor the EIP-712 digest.
		expectNotSupported(eipSupport['8213'])

		// Each EIP cites its own per-ERC reference block, not the top-level
		// transaction legibility references.
		expect(refUrls(eipSupport['712'])).toEqual(['https://example.com/8213'])
		expect(refUrls(eipSupport['4361'])).toEqual(['https://example.com/4361'])
		expect(refUrls(eipSupport['7730'])).toEqual(['https://example.com/7730'])
		expect(refUrls(eipSupport['8213'])).toEqual(['https://example.com/8213'])
	})

	it('credits ERC-8213 when the domain hash and message hash are shown together', () => {
		const eipSupport = walletEipSupport({
			...unratedFeatures(),
			security: {
				...unratedFeatures().security,
				transactionLegibility: {
					ref: { url: 'https://example.com/legibility' },
					erc4361: null,
					erc8213: supported({
						ref: { url: 'https://example.com/8213' },
						calldataDisplay: null,
						messageSigningLegibility: {
							[MessageSigningDetails.EIP712_STRUCT]: DataDisplayOptions.NOT_IN_UI,
							[MessageSigningDetails.DOMAIN_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							[MessageSigningDetails.MESSAGE_HASH]: DataDisplayOptions.SHOWN_BY_DEFAULT,
							[MessageSigningDetails.EIP712_DIGEST]: DataDisplayOptions.NOT_IN_UI,
						},
					}),
					erc7730: null,
					transactionSimulations: null,
					transactionDetailsDisplay: null,
				},
			},
		})

		// Per ERC-8213, displaying the domain hash and message hash together is
		// an accepted alternative to displaying the EIP-712 digest.
		expectSupported(eipSupport['8213'])
	})

	/** Hardware wallet features with the given per-benchmark ERC-7730 data. */
	function hardwareErc7730Features(
		benchmarks: Record<ComplexBenchmarkTransactions, DataLocation | null>,
	): ResolvedFeatures {
		return {
			...unratedHardwareFeatures(),
			security: {
				...unratedHardwareFeatures().security,
				transactionLegibility: {
					ref: { url: 'https://example.com/hardware-legibility' },
					erc4361: null,
					erc8213: null,
					erc7730: supported({
						ref: { url: 'https://example.com/hardware-7730' },
						...benchmarks,
					}),
					detailsDisplayed: null,
					dataExtraction: null,
				},
			},
		}
	}

	it('derives ERC-7730 from hardware transaction legibility when all benchmarks decode', () => {
		const eipSupport = walletEipSupport(
			hardwareErc7730Features({
				[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
				[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.OFF_DEVICE,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
					DataLocation.OFF_DEVICE,
				[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
					DataLocation.OFF_DEVICE,
			}),
		)

		// The wallet decodes every benchmark transaction, on-device or through
		// the companion app.
		expectSupported(eipSupport['7730'])
		// The ERC-8213 data was not assessed.
		expect(eipSupport['8213']).toBe('UNKNOWN')
		expect(eipSupport['712']).toBe('UNKNOWN')
	})

	it('does not credit ERC-7730 when only some benchmark transactions decode', () => {
		const eipSupport = walletEipSupport(
			hardwareErc7730Features({
				[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
				[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.NOT_PROVIDED,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: DataLocation.NOT_PROVIDED,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
					DataLocation.NOT_PROVIDED,
				[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
					DataLocation.NOT_PROVIDED,
			}),
		)

		// ERC-7730 is registry-based: a wallet that decodes only some of the
		// benchmark transactions does not implement it.
		expectNotSupported(eipSupport['7730'])
	})

	it('leaves ERC-7730 unknown when unassessed benchmarks could still decode', () => {
		const eipSupport = walletEipSupport(
			hardwareErc7730Features({
				[ComplexBenchmarkTransactions.USDC_APPROVAL]: DataLocation.ON_DEVICE,
				[ComplexBenchmarkTransactions.AAVE_SUPPLY]: DataLocation.ON_DEVICE,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_SUPPLY_NESTED]: null,
				[ComplexBenchmarkTransactions.SAFEWALLET_AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]:
					null,
				[ComplexBenchmarkTransactions.AAVE_USDC_APPROVE_SUPPLY_BATCH_NESTED_MULTISEND]: null,
			}),
		)

		// Every assessed benchmark decodes, but some benchmarks have not been
		// assessed, so full registry coverage cannot be confirmed either way.
		expect(eipSupport['7730']).toBe('UNKNOWN')
	})
})
