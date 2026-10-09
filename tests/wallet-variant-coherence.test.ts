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
	 * Returns the field's value for the given wallet, or `null` if the field
	 * is not filled in (or does not apply to this type of wallet).
	 */
	getValue: (wallet: BaseWallet<AttributeGroupId>) => unknown
}

const variantSentinelFields: VariantSentinelField[] = [
	{
		name: 'security.securityBestPractices.browser',
		variant: Variant.BROWSER,
		sentinel: 'NOT_A_BROWSER_EXTENSION',
		getValue: wallet => wallet.features.security.securityBestPractices?.browser ?? null,
	},
	{
		name: 'security.securityBestPractices.mobile',
		variant: Variant.MOBILE,
		sentinel: 'NOT_A_MOBILE_APP',
		getValue: wallet => wallet.features.security.securityBestPractices?.mobile ?? null,
	},
	{
		name: 'security.securityBestPractices.desktop',
		variant: Variant.DESKTOP,
		sentinel: 'NOT_A_DESKTOP_APP',
		getValue: wallet => wallet.features.security.securityBestPractices?.desktop ?? null,
	},
	{
		name: 'integration.browser',
		variant: Variant.BROWSER,
		sentinel: 'NOT_A_BROWSER_WALLET',
		getValue: wallet =>
			isWalletSoftwareFeatures(wallet.features) ? wallet.features.integration.browser : null,
	},
]

/**
 * Known incoherent `${walletId}:${fieldName}` pairs, skipped by the coherence
 * check below.
 *
 * `family:integration.browser`: Family is mobile-only but still carries a
 * browser integration record. The fix sits next to lines changed by an open
 * data PR for this wallet (#1373), so it is deferred until that PR merges to
 * avoid a merge conflict.
 *
 * Entries are checked to still be incoherent, so this list cannot go stale.
 */
const knownIncoherentFields = new Set<string>(['family:integration.browser'])

/** Whether the field's value is consistent with the wallet's variants. */
function isCoherent(wallet: BaseWallet<AttributeGroupId>, field: VariantSentinelField): boolean {
	const value = field.getValue(wallet)

	if (value === null) {
		return true
	}

	return (value === field.sentinel) === (wallet.variants[field.variant] !== true)
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
