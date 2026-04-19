import { allWallets, type WalletName } from '@/data/wallets'
import type { Variant } from '@/schema/variants'

/**
 * Returns the relative URL for a wallet page, optionally including a variant
 * query parameter and/or an anchor.
 *
 * @param wallet - Either a `WalletName` key (e.g. `'metamask'`) or any object
 *   that carries `metadata.id` (e.g. `RatedWallet`, `BaseWallet`).
 * @param options.variant - When set, appends `?variant=<variant>` to the URL.
 * @param options.attributeAnchor - When set, appends `#<anchor>` to the URL.
 *   Pass a pre-formatted slug (e.g. the result of `slugifyCamelCase(id)`).
 *
 * @example
 * getWalletUrl(wallet)
 * // => '/metamask/'
 *
 * getWalletUrl(wallet, { variant: Variant.MOBILE })
 * // => '/metamask/?variant=MOBILE'
 *
 * getWalletUrl(wallet, { attributeAnchor: 'security-audits' })
 * // => '/metamask/#security-audits'
 *
 * getWalletUrl(wallet, { variant: Variant.MOBILE, attributeAnchor: 'security-audits' })
 * // => '/metamask/?variant=MOBILE#security-audits'
 */
export function getWalletUrl(
	wallet: WalletName | { metadata: { id: string } },
	options?: {
		variant?: Variant | null
		attributeAnchor?: string | null
	},
): string {
	const slug = typeof wallet === 'string' ? allWallets[wallet].metadata.id : wallet.metadata.id
	const variant = options?.variant ?? null
	const attributeAnchor = options?.attributeAnchor ?? null

	let url = `/${slug}/`

	if (variant !== null) {
		url += `?variant=${variant}`
	}

	if (attributeAnchor !== null) {
		url += `#${attributeAnchor}`
	}

	return url
}
