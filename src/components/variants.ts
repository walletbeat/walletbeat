import { type AtLeastOneVariant, hasSingleVariant, Variant } from '@/schema/variants';

/**
 * Human-readable variant name.
 */
export function variantToName(variant: Variant, titleCase: boolean): string {
	switch (variant) {
		case Variant.BROWSER:
			return titleCase ? 'Browser' : 'browser'
		case Variant.DESKTOP:
			return titleCase ? 'Desktop' : 'desktop'
		case Variant.MOBILE:
			return titleCase ? 'Mobile' : 'mobile'
		case Variant.EMBEDDED:
			return titleCase ? 'Embedded' : 'embedded'
		case Variant.HARDWARE:
			return titleCase ? 'Hardware' : 'hardware'
	}
}

/**
 * Human-readable variant name that fits in a sentence like
 * "This wallet runs ${variant}".
 */
export function variantToRunsOn(variant: Variant): string {
	switch (variant) {
		case Variant.BROWSER:
			return 'as a browser extension'
		case Variant.DESKTOP:
			return 'as a desktop application'
		case Variant.MOBILE:
			return 'on mobile'
		case Variant.EMBEDDED:
			return 'within other applications'
		case Variant.HARDWARE:
			return 'as a hardware wallet'
	}
}

/**
 * Tooltip for variant picker.
 */
export function variantToTooltip(variants: AtLeastOneVariant<unknown>, variant: Variant): string {
	if (hasSingleVariant(variants)) {
		return `${variantToName(variant, true)}-only wallet`
	}

	return `View ${variantToName(variant, false)} version`
}

/**
 * Return a `?${variant}` query string if supported by `variants`.
 * @param variants The variants object supported by a wallet.
 * @param variant The selected variant, or `null` if no selected variant.
 * @returns A query string suitable for the per-wallet page.
 */
export function variantUrlQuery(
	variants: AtLeastOneVariant<unknown>,
	variant: Variant | null,
): string {
	if (variant === null || hasSingleVariant(variants) || !Object.hasOwn(variants, variant)) {
		return ''
	}

	return `?${variant}`
}

/**
 * Return a Variant if present in the URL and supported by a wallet.
 * @param variants The variants object supported by a wallet.
 * @returns The Variant from the URL, or `null` if not present or unsupported.
 */
export function variantFromUrlQuery(variants: AtLeastOneVariant<unknown>): Variant | null {
	if (window.location.search === '') {
		return null
	}

	const maybeVariant = window.location.search.substring(1)

	if (maybeVariant !== '' && Object.hasOwn(variants, maybeVariant)) {
		return maybeVariant as Variant // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- We just verified that it is a valid Variant.
	}

	return null
}
