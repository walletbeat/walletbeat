import { remap } from '@/types/utils/remap'

import type { EipNumber } from './eips'
import type { ResolvedFeatures } from './features'
import { AccountType } from './features/account-support'
import type { BrowserIntegrationEip } from './features/ecosystem/integration'
import { PrivateTransferTechnology } from './features/privacy/transaction-privacy'
import {
	CallDataDisplay,
	ComplexBenchmarkTransactions,
	type DataDisplayOptions,
	DataLocation,
	type HardwareTransactionLegibilityImplementation,
	type HardwareWalletErc7730,
	type HardwareWalletErc8213,
	isShown,
	MessageSigningDetails,
	type SoftwareTransactionLegibilityImplementation,
	type SoftwareWalletErc7730,
	type SoftwareWalletErc8213,
} from './features/security/transaction-legibility'
import { featureSupported, isSupported, notSupported, type Support } from './features/support'
import { hasRefs, refNotNecessary, type WithRef } from './reference'

/**
 * Whether a wallet implements a specific EIP.
 *
 * - `SUPPORTED` means the wallet implements the EIP, at least partially.
 * - `NOT_SUPPORTED` means the wallet was verified not to implement the EIP.
 * - `null` means the implementation status is unknown, or that the EIP does
 *   not apply to this type of wallet (e.g. browser integration EIPs for
 *   wallets that have no browser variant).
 */
export type EipSupport = WithRef<Support> | null

/** EIP implementation status for every EIP tracked by Walletbeat. */
export type WalletEipSupport = Record<EipNumber, EipSupport>

/** A `Support` value annotated with references. */
function supportWithRef(
	implemented: boolean,
	ref: WithRef<unknown>['ref'] | undefined,
): WithRef<Support> {
	return {
		...(implemented ? featureSupported : notSupported),
		ref: ref ?? refNotNecessary,
	}
}

/**
 * Normalize a feature-level `Support` value into an `EipSupport`, preserving
 * references attached to the value itself and falling back to `fallbackRef`
 * (typically the references of the enclosing feature) otherwise.
 */
function normalizeSupport(
	support: Support<object> | null,
	fallbackRef?: WithRef<unknown>['ref'],
): EipSupport {
	if (support === null) {
		return null
	}

	return supportWithRef(isSupported(support), hasRefs(support) ? support.ref : fallbackRef)
}

/** EIP support based on the browser integration record. */
function browserIntegrationEipSupport(
	features: ResolvedFeatures,
	eip: BrowserIntegrationEip,
): EipSupport {
	const browser = features.integration.browser

	if (browser === 'NOT_A_BROWSER_WALLET') {
		return null
	}

	return normalizeSupport(browser[eip], browser.ref)
}

/** EIP support based on the wallet supporting a specific account type. */
function accountTypeEipSupport(
	features: ResolvedFeatures,
	accountType: AccountType.eip7702 | AccountType.rawErc4337,
): EipSupport {
	const accountSupport = features.accountSupport

	if (accountSupport === null) {
		return null
	}

	return normalizeSupport(accountSupport[accountType])
}

/** EIP support based on chain-specific address resolution. */
function addressResolutionEipSupport(
	features: ResolvedFeatures,
	erc: 'erc7828' | 'erc7831',
): EipSupport {
	const addressResolution = features.addressResolution

	if (addressResolution === null) {
		return null
	}

	return normalizeSupport(addressResolution.chainSpecificAddressing[erc], addressResolution.ref)
}

/**
 * EIP support derived from the transaction legibility feature.
 * `derive` returns whether the EIP is implemented, or `null` if the
 * transaction legibility data does not answer that question.
 */
function transactionLegibilityEipSupport(
	features: ResolvedFeatures,
	derive: (
		transactionLegibility:
			| HardwareTransactionLegibilityImplementation
			| SoftwareTransactionLegibilityImplementation,
	) => boolean | null,
): EipSupport {
	const transactionLegibility = features.security.transactionLegibility

	if (transactionLegibility === null) {
		return null
	}

	const implemented = derive(transactionLegibility)

	if (implemented === null) {
		return null
	}

	return supportWithRef(implemented, transactionLegibility.ref)
}

/**
 * Whether a display entry is shown to the user.
 * Handles both the software wallet shape (a bare `DataDisplayOptions`) and
 * the hardware wallet shape (a `DisplayCapability` object).
 */
function displayEntryIsShown(entry: DataDisplayOptions | { display: DataDisplayOptions }): boolean {
	return isShown(typeof entry === 'object' ? entry.display : entry)
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
	'712': features =>
		transactionLegibilityEipSupport(features, transactionLegibility => {
			const erc8213 = transactionLegibility.erc8213

			if (erc8213 === null) {
				return null
			}

			if (!isSupported<HardwareWalletErc8213 | SoftwareWalletErc8213>(erc8213)) {
				return false
			}

			const messageSigningLegibility = erc8213.messageSigningLegibility

			if (messageSigningLegibility === null) {
				return null
			}

			return Object.values(MessageSigningDetails).some(detail =>
				displayEntryIsShown(messageSigningLegibility[detail]),
			)
		}),
	'1193': features => browserIntegrationEipSupport(features, '1193'),
	'2700': features => browserIntegrationEipSupport(features, '2700'),
	'4337': features => accountTypeEipSupport(features, AccountType.rawErc4337),
	'5564': features => {
		const transactionPrivacy = features.privacy.transactionPrivacy

		if (transactionPrivacy === null) {
			return null
		}

		return normalizeSupport(transactionPrivacy[PrivateTransferTechnology.STEALTH_ADDRESSES])
	},
	'5792': features => normalizeSupport(features.walletCall),
	'6963': features => browserIntegrationEipSupport(features, '6963'),
	'7702': features => accountTypeEipSupport(features, AccountType.eip7702),
	// A wallet implements ERC-7730 if it decodes at least one of the complex
	// benchmark transactions into a human-readable description (for hardware
	// wallets: on-device or through the companion app).
	'7730': features =>
		transactionLegibilityEipSupport(features, transactionLegibility => {
			const erc7730 = transactionLegibility.erc7730

			if (erc7730 === null) {
				return null
			}

			if (!isSupported<HardwareWalletErc7730 | SoftwareWalletErc7730>(erc7730)) {
				return false
			}

			return Object.values(ComplexBenchmarkTransactions).some(benchmark => {
				const entry = erc7730[benchmark]

				if (entry === null) {
					return false
				}

				if (typeof entry === 'string') {
					return entry === DataLocation.ON_DEVICE || entry === DataLocation.OFF_DEVICE
				}

				return isShown(entry.decoded)
			})
		}),
	'7828': features => addressResolutionEipSupport(features, 'erc7828'),
	'7831': features => addressResolutionEipSupport(features, 'erc7831'),
	// A wallet implements ERC-8213 if it exposes the calldata digest or the
	// EIP-712 digest when the user is asked to sign.
	'8213': features =>
		transactionLegibilityEipSupport(features, transactionLegibility => {
			const erc8213 = transactionLegibility.erc8213

			if (erc8213 === null) {
				return null
			}

			if (!isSupported<HardwareWalletErc8213 | SoftwareWalletErc8213>(erc8213)) {
				return false
			}

			const { calldataDisplay, messageSigningLegibility } = erc8213

			if (calldataDisplay === null && messageSigningLegibility === null) {
				return null
			}

			return (
				(calldataDisplay !== null &&
					displayEntryIsShown(calldataDisplay[CallDataDisplay.CALLDATA_DIGEST])) ||
				(messageSigningLegibility !== null &&
					displayEntryIsShown(messageSigningLegibility[MessageSigningDetails.EIP712_DIGEST]))
			)
		}),
}

/**
 * Determine which EIPs a wallet implements, based on its resolved features.
 * This is the common building block for all UI that displays per-EIP wallet
 * support (EIP directory pages, per-EIP wallet support trackers, etc.).
 */
export function walletEipSupport(features: ResolvedFeatures): WalletEipSupport {
	return remap(
		eipSupportResolvers,
		(_: EipNumber, resolve: (features: ResolvedFeatures) => EipSupport) => resolve(features),
	)
}
