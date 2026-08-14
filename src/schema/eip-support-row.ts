import type { EipSupport } from './eip-support'
import { isSupported } from './features/support'
import type { Variant } from './variants'

/**
 * Serializable per-wallet row for EIP support tracker tables.
 *
 * EIP tracker tables are hydrated islands (for client-side sorting), and
 * Astro serializes all island props into the page HTML. Pages must therefore
 * precompute these slim rows at build time instead of passing full
 * `RatedWallet` objects, which weigh tens of megabytes once serialized.
 *
 * This module must stay free of data imports so that importing it from
 * client-side components does not pull wallet data into the JS bundle.
 */

export const EipSupportStatus = {
	SUPPORTED: 'SUPPORTED',
	NOT_SUPPORTED: 'NOT_SUPPORTED',
	UNKNOWN: 'UNKNOWN',
	NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const

export type EipSupportStatus = (typeof EipSupportStatus)[keyof typeof EipSupportStatus]

/** Collapse an `EipSupport` value into its display status. */
export const eipSupportStatus = (support: EipSupport): EipSupportStatus => {
	if (typeof support === 'string') {
		return support === 'UNKNOWN' ? EipSupportStatus.UNKNOWN : EipSupportStatus.NOT_APPLICABLE
	}

	return isSupported(support) ? EipSupportStatus.SUPPORTED : EipSupportStatus.NOT_SUPPORTED
}

/** Everything an EIP support table needs to render one wallet. */
export interface EipSupportRow {
	id: string
	displayName: string
	iconExtension: string
	url: string
	overall: EipSupportStatus
	variants: Array<{ variant: Variant; status: EipSupportStatus }>
	sourceUrls: Array<{ url: string; label: string }>
}
