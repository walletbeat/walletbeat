import { eips } from '@/data/eips'
import { setContains, setItems } from '@/types/utils/non-empty'
import { remap } from '@/types/utils/remap'

import type { EipNumber } from './eips'
import type { ResolvedFeatures } from './features'
import type { BrowserIntegrationEip } from './features/ecosystem/integration'
import { PrivateTransferTechnology } from './features/privacy/transaction-privacy'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	DataLocation,
	displayEntryIsShown,
	type HardwareWalletErc7730,
	type HardwareWalletErc8213,
	isShown,
	MessageSigningDetails,
	type SoftwareWalletErc7730,
	type SoftwareWalletErc8213,
} from './features/security/transaction-legibility'
import { featureSupported, isSupported, notSupported, type Support } from './features/support'
import { hasRefs, mergeRefs, refTodo, type WithRef } from './reference'
import { getVariants, type Variant } from './variants'
import { getVariantResolvedWallet, type RatedWallet } from './wallet'

/**
 * Whether a wallet implements a specific EIP.
 *
 * - `Supported` means the wallet implements the EIP, at least partially.
 * - `NotSupported` means the wallet was verified not to implement the EIP.
 * - `'UNKNOWN'` means the implementation status has not been assessed yet.
 * - `'NOT_APPLICABLE'` means the EIP does not apply to this type of wallet
 *   (e.g. browser integration EIPs for wallets that have no browser variant).
 */
export type EipSupport = WithRef<Support> | 'UNKNOWN' | 'NOT_APPLICABLE'

/** EIP implementation status for every EIP tracked by Walletbeat. */
export type WalletEipSupport = Record<EipNumber, EipSupport>

/**
 * An implemented/not-implemented EIP support value, annotated with the
 * given hand-picked reference sources merged together.
 * Falls back to `refTodo` when none of the sources carry references.
 */
function eipSupport(
	implemented: boolean,
	...refSources: Array<WithRef<unknown>['ref'] | undefined>
): WithRef<Support> {
	const mergedRefs = mergeRefs(...refSources)

	return {
		...(implemented ? featureSupported : notSupported),
		ref: mergedRefs.length > 0 ? mergedRefs : refTodo,
	}
}

/** EIP support based on the browser integration record. */
function browserIntegrationEipSupport(
	features: ResolvedFeatures,
	eip: BrowserIntegrationEip,
): EipSupport {
	const browser = features.integration.browser

	if (browser === 'NOT_A_BROWSER_WALLET') {
		return 'NOT_APPLICABLE'
	}

	const support = browser[eip]

	if (support === null) {
		return 'UNKNOWN'
	}

	// The browser integration record's references document all browser EIPs.
	return eipSupport(isSupported(support), hasRefs(support) ? support.ref : undefined, browser.ref)
}

/** EIP support based on chain-specific address resolution. */
function addressResolutionEipSupport(
	features: ResolvedFeatures,
	erc: 'erc7828' | 'erc7831',
): EipSupport {
	const addressResolution = features.addressResolution

	if (addressResolution === null) {
		return 'UNKNOWN'
	}

	const support = addressResolution.chainSpecificAddressing[erc]

	if (support === null) {
		return 'UNKNOWN'
	}

	// The address resolution record's references document both address ERCs.
	return eipSupport(
		isSupported(support),
		hasRefs(support) ? support.ref : undefined,
		addressResolution.ref,
	)
}

/**
 * How each tracked EIP's implementation status is derived from a wallet's
 * resolved features.
 * The `Support` value only answers "does the wallet implement this EIP at
 * all?"; graded assessments of implementation *quality* belong in attributes.
 */
const eipSupportResolvers: Record<EipNumber, (features: ResolvedFeatures) => EipSupport> = {
	// EIP-712 signing legibility is recorded as part of the ERC-8213
	// message signing data. A wallet implements EIP-712 if it surfaces any
	// EIP-712-specific data (decoded struct, domain/message hash or digest)
	// when signing typed data.
	'712': features => {
		const transactionLegibility = features.security.transactionLegibility

		if (transactionLegibility === null) {
			return 'UNKNOWN'
		}

		const erc8213 = transactionLegibility.erc8213

		if (erc8213 === null) {
			return 'UNKNOWN'
		}

		if (!isSupported<HardwareWalletErc8213 | SoftwareWalletErc8213>(erc8213)) {
			return eipSupport(false, erc8213.ref)
		}

		const messageSigningLegibility = erc8213.messageSigningLegibility

		if (messageSigningLegibility === null) {
			return 'UNKNOWN'
		}

		return eipSupport(
			Object.values(MessageSigningDetails).some(detail =>
				displayEntryIsShown(messageSigningLegibility[detail]),
			),
			erc8213.ref,
		)
	},
	'1193': features => browserIntegrationEipSupport(features, '1193'),
	'2700': features => browserIntegrationEipSupport(features, '2700'),
	// A wallet supports ERC-4361 if the transaction legibility record explicitly
	// tracks Sign-In with Ethereum support.
	'4361': features => {
		const transactionLegibility = features.security.transactionLegibility

		if (transactionLegibility === null || transactionLegibility.erc4361 === null) {
			return 'UNKNOWN'
		}

		return eipSupport(isSupported(transactionLegibility.erc4361), transactionLegibility.erc4361.ref)
	},
	// A wallet supports ERC-4337 if it supports raw ERC-4337 accounts, or if
	// its EIP-7702 delegate contract is itself an ERC-4337 account (i.e. it
	// implements `validateUserOp`). EIP-7702 alone does not imply ERC-4337:
	// the delegate contract may not be an ERC-4337 account, so a wallet whose
	// delegate contract is unknown stays unknown.
	'4337': features => {
		const accountSupport = features.accountSupport

		if (accountSupport === null) {
			return 'UNKNOWN'
		}

		const { rawErc4337, eip7702 } = accountSupport

		// Whether the EIP-7702 delegate contract is an ERC-4337 account, or
		// `null` if the delegate contract is not known.
		let delegateIsErc4337: boolean | null = false

		if (isSupported(eip7702)) {
			delegateIsErc4337 =
				eip7702.contract === 'UNKNOWN' ? null : isSupported(eip7702.contract.methods.validateUserOp)
		}

		if (isSupported(rawErc4337) || delegateIsErc4337 === true) {
			return eipSupport(
				true,
				isSupported(rawErc4337) ? rawErc4337.ref : undefined,
				delegateIsErc4337 === true && isSupported(eip7702) ? eip7702.ref : undefined,
			)
		}

		if (delegateIsErc4337 === null) {
			return 'UNKNOWN'
		}

		return eipSupport(false)
	},
	'5564': features => {
		const transactionPrivacy = features.privacy.transactionPrivacy

		if (transactionPrivacy === null) {
			return 'UNKNOWN'
		}

		const stealthAddresses = transactionPrivacy[PrivateTransferTechnology.STEALTH_ADDRESSES]

		return eipSupport(
			isSupported(stealthAddresses),
			hasRefs(stealthAddresses) ? stealthAddresses.ref : undefined,
		)
	},
	'5792': features => {
		const walletCall = features.walletCall

		if (walletCall === null) {
			return 'UNKNOWN'
		}

		return eipSupport(isSupported(walletCall), hasRefs(walletCall) ? walletCall.ref : undefined)
	},
	'6963': features => browserIntegrationEipSupport(features, '6963'),
	'7702': features => {
		const accountSupport = features.accountSupport

		if (accountSupport === null) {
			return 'UNKNOWN'
		}

		const eip7702 = accountSupport.eip7702

		return eipSupport(isSupported(eip7702), isSupported(eip7702) ? eip7702.ref : undefined)
	},
	// ERC-7730 is registry-based: a wallet that implements it decodes every
	// transaction in the registry, so it must decode *all* of the complex
	// benchmark transactions into a human-readable description (for hardware
	// wallets: on-device or through the companion app).
	'7730': features => {
		const transactionLegibility = features.security.transactionLegibility

		if (transactionLegibility === null) {
			return 'UNKNOWN'
		}

		const erc7730 = transactionLegibility.erc7730

		if (erc7730 === null) {
			return 'UNKNOWN'
		}

		if (!isSupported<HardwareWalletErc7730 | SoftwareWalletErc7730>(erc7730)) {
			return eipSupport(false, erc7730.ref)
		}

		const decoded = Object.values(ComplexBenchmarkTransactions).map((benchmark): boolean | null => {
			const entry = erc7730[benchmark]

			if (entry === null) {
				return null
			}

			if (typeof entry === 'string') {
				return entry === DataLocation.ON_DEVICE || entry === DataLocation.OFF_DEVICE
			}

			return isShown(entry.decoded)
		})

		if (decoded.includes(false)) {
			return eipSupport(false, erc7730.ref)
		}

		if (decoded.includes(null)) {
			return 'UNKNOWN'
		}

		return eipSupport(true, erc7730.ref)
	},
	'7828': features => addressResolutionEipSupport(features, 'erc7828'),
	'7831': features => addressResolutionEipSupport(features, 'erc7831'),
	// A wallet implements ERC-8213 if it displays the calldata digest, or
	// satisfies the ERC's EIP-712 signing display requirement: the EIP-712
	// digest, or the domain hash and message hash together.
	'8213': features => {
		const transactionLegibility = features.security.transactionLegibility

		if (transactionLegibility === null) {
			return 'UNKNOWN'
		}

		const erc8213 = transactionLegibility.erc8213

		if (erc8213 === null) {
			return 'UNKNOWN'
		}

		if (!isSupported<HardwareWalletErc8213 | SoftwareWalletErc8213>(erc8213)) {
			return eipSupport(false, erc8213.ref)
		}

		const { calldataDisplay, messageSigningLegibility } = erc8213

		if (calldataDisplay === null && messageSigningLegibility === null) {
			return 'UNKNOWN'
		}

		const calldataDigestShown =
			calldataDisplay !== null &&
			displayEntryIsShown(calldataDisplay[CallDataDisplay.CALLDATA_DIGEST])
		const signatureDigestShown =
			messageSigningLegibility !== null &&
			(displayEntryIsShown(messageSigningLegibility[MessageSigningDetails.EIP712_DIGEST]) ||
				(displayEntryIsShown(messageSigningLegibility[MessageSigningDetails.DOMAIN_HASH]) &&
					displayEntryIsShown(messageSigningLegibility[MessageSigningDetails.MESSAGE_HASH])))

		return eipSupport(calldataDigestShown || signatureDigestShown, erc8213.ref)
	},
}

/**
 * Determine a wallet's implementation status for a single EIP, based on its
 * resolved features. EIPs that do not apply to the wallet's variant (as declared
 * by the EIP's `appliesTo` field) are not applicable regardless of features.
 */
function resolveEipSupport(eipNumber: EipNumber, features: ResolvedFeatures): EipSupport {
	if (!setContains(eips[eipNumber].appliesTo, features.variant)) {
		return 'NOT_APPLICABLE'
	}

	return eipSupportResolvers[eipNumber](features)
}

/**
 * Determine which EIPs a wallet implements, based on its resolved features.
 * This is the common building block for all UI that displays per-EIP wallet
 * support (EIP directory pages, per-EIP wallet support trackers, etc.).
 */
export function walletEipSupport(features: ResolvedFeatures): WalletEipSupport {
	return remap(eipSupportResolvers, (eipNumber: EipNumber) =>
		resolveEipSupport(eipNumber, features),
	)
}

/** A rated wallet's support for a single EIP. */
export interface RatedWalletEipSupport {
	/** Support aggregated across all of the wallet's variants. */
	overall: EipSupport

	/** Support for each variant the wallet exists in. */
	perVariant: Partial<Record<Variant, EipSupport>>
}

/**
 * Aggregate EIP support values across a wallet's variants.
 * The wallet supports the EIP if any variant supports it, and verifiably does
 * not support it only if no variant might (i.e. none is unknown). The EIP is
 * not applicable to the wallet only if it applies to no variant at all.
 */
export function aggregateEipSupport(supports: EipSupport[]): EipSupport {
	const assessed = supports.filter(support => typeof support !== 'string')
	const supporting = assessed.filter(support => isSupported(support))

	if (supporting.length > 0) {
		return eipSupport(true, ...supporting.map(support => support.ref))
	}

	if (supports.includes('UNKNOWN') || supports.length === 0) {
		return 'UNKNOWN'
	}

	if (assessed.length > 0) {
		return eipSupport(false, ...assessed.map(support => support.ref))
	}

	return 'NOT_APPLICABLE'
}

/**
 * Determine a rated wallet's support for a single EIP, per variant and
 * aggregated across all variants.
 */
export function ratedWalletEipSupport<_AttributeGroupId extends string>(
	wallet: RatedWallet<_AttributeGroupId>,
	eipNumber: EipNumber,
): RatedWalletEipSupport {
	const perVariant: Partial<Record<Variant, EipSupport>> = {}
	const variantSupports: EipSupport[] = []

	for (const variant of setItems(getVariants(wallet.variants))) {
		const resolvedWallet = getVariantResolvedWallet(wallet, variant)

		if (resolvedWallet === null) {
			continue
		}

		const support = resolveEipSupport(eipNumber, resolvedWallet.features)

		perVariant[variant] = support
		variantSupports.push(support)
	}

	return { overall: aggregateEipSupport(variantSupports), perVariant }
}
