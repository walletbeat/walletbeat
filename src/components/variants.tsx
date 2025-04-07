import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import LanguageIcon from '@mui/icons-material/Language'
import MonitorIcon from '@mui/icons-material/Monitor'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import MemoryIcon from '@mui/icons-material/Memory'
import type { SvgIconComponent } from '@mui/icons-material'
import { type AtLeastOneVariant, hasSingleVariant, Variant } from '@/schema/variants'
import React from 'react'

/**
 * @returns An SVG icon representing the given variant.
 */
export function variantToIcon(variant: Variant): SvgIconComponent {
	// Create styled components that correctly inherit colors from parent
	const StyledLanguageIcon = React.forwardRef((props: any, ref) => (
		<LanguageIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	));
	
	const StyledMonitorIcon = React.forwardRef((props: any, ref) => (
		<MonitorIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	));
	
	const StyledPhoneAndroidIcon = React.forwardRef((props: any, ref) => (
		<PhoneAndroidIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	));
	
	const StyledSettingsEthernetIcon = React.forwardRef((props: any, ref) => (
		<SettingsEthernetIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	));
	
	const StyledMemoryIcon = React.forwardRef((props: any, ref) => (
		<MemoryIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	));
	
	switch (variant) {
		case Variant.BROWSER:
			return StyledLanguageIcon as unknown as SvgIconComponent;
		case Variant.DESKTOP:
			return StyledMonitorIcon as unknown as SvgIconComponent;
		case Variant.MOBILE:
			return StyledPhoneAndroidIcon as unknown as SvgIconComponent;
		case Variant.EMBEDDED:
			return StyledSettingsEthernetIcon as unknown as SvgIconComponent;
		case Variant.HARDWARE:
			return StyledMemoryIcon as unknown as SvgIconComponent;
	}
}

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
