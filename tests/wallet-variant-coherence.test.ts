import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import type { AttributeGroupId } from '@/schema/attribute-tree'
import { isWalletSoftwareFeatures } from '@/schema/features'
import { Variant } from '@/schema/variants'
import type { BaseWallet } from '@/schema/wallet'

/**
 * A wallet feature field whose value has a "this variant does not exist"
 * sentinel, e.g. `NOT_A_BROWSER_EXTENSION`.
 */
interface VariantSentinelField {
	/** Path of the field within the wallet's features, for error messages. */
	name: string

	/** The variant whose existence the sentinel describes. */
	variant: Variant

	/** The sentinel value meaning the wallet does not have this variant. */
	sentinel: string

	/**
	 * Whether the wallet's value for this field is the sentinel, or `null` if
	 * the field is not filled in (or does not apply to this type of wallet).
	 */
	isSentinel: (wallet: BaseWallet<AttributeGroupId>) => boolean | null
}

function variantSentinelField<T>(
	name: string,
	variant: Variant,
	sentinel: NoInfer<T> & string,
	getValue: (wallet: BaseWallet<AttributeGroupId>) => T | null | undefined,
): VariantSentinelField {
	return {
		name,
		variant,
		sentinel,
		isSentinel: wallet => {
			const value = getValue(wallet)

			return value === null || value === undefined ? null : value === sentinel
		},
	}
}

const variantSentinelFields: VariantSentinelField[] = [
	variantSentinelField(
		'security.securityBestPractices.browser',
		Variant.BROWSER,
		'NOT_A_BROWSER_EXTENSION',
		wallet => wallet.features.security.securityBestPractices?.browser,
	),
	variantSentinelField(
		'security.securityBestPractices.mobile',
		Variant.MOBILE,
		'NOT_A_MOBILE_APP',
		wallet => wallet.features.security.securityBestPractices?.mobile,
	),
	variantSentinelField(
		'security.securityBestPractices.desktop',
		Variant.DESKTOP,
		'NOT_A_DESKTOP_APP',
		wallet => wallet.features.security.securityBestPractices?.desktop,
	),
	variantSentinelField('integration.browser', Variant.BROWSER, 'NOT_A_BROWSER_WALLET', wallet =>
		isWalletSoftwareFeatures(wallet.features) ? wallet.features.integration.browser : null,
	),
]

/**
 * Known incoherent `${walletId}:${fieldName}` pairs, skipped by the coherence
 * check below.
 *
 * `family:integration.browser`: Family is mobile-only but carries a browser
 * integration record.
 *
 * Entries are checked to still be incoherent, so this list cannot go stale.
 */
const knownIncoherentFields = new Set<string>(['family:integration.browser'])

/** Whether the field's value is consistent with the wallet's variants. */
function isCoherent(wallet: BaseWallet<AttributeGroupId>, field: VariantSentinelField): boolean {
	const isSentinel = field.isSentinel(wallet)

	return isSentinel === null || isSentinel === (wallet.variants[field.variant] !== true)
}

describe('wallet variant coherence', () => {
	for (const wallet of Object.values(allWallets)) {
		describe(wallet.metadata.displayName, () => {
			for (const field of variantSentinelFields) {
				const allowlistKey = `${wallet.metadata.id}:${field.name}`

				if (knownIncoherentFields.has(allowlistKey)) {
					it(`is still listed correctly as incoherent for ${field.name}`, () => {
						expect(
							isCoherent(wallet, field),
							`${allowlistKey} is now coherent; remove it from knownIncoherentFields`,
						).toBe(false)
					})
					continue
				}

				it(`has ${field.name} consistent with its ${field.variant} variant`, () => {
					const hasVariant = wallet.variants[field.variant] === true

					expect(
						isCoherent(wallet, field),
						hasVariant
							? `${wallet.metadata.id} has a ${field.variant} variant, so ${field.name} must not be '${field.sentinel}'`
							: `${wallet.metadata.id} has no ${field.variant} variant, so ${field.name} must be '${field.sentinel}' (or null)`,
					).toBe(true)
				})
			}
		})
	}
})
