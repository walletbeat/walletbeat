import ExtensionIcon from '@material-icons/svg/svg/extension/outline.svg?raw'
import HardwareIcon from '@material-icons/svg/svg/hardware/baseline.svg?raw'
import MonitorIcon from '@material-icons/svg/svg/monitor/baseline.svg?raw'
import PhoneAndroidIcon from '@material-icons/svg/svg/phone_android/baseline.svg?raw'
import SettingsEthernetIcon from '@material-icons/svg/svg/settings_ethernet/baseline.svg?raw'

import { type AtLeastOneVariant, hasSingleVariant, Variant } from '@/schema/variants'

export const variants = {
	[Variant.BROWSER]: {
		label: 'Browser extension',
		icon: ExtensionIcon,
	},
	[Variant.DESKTOP]: {
		label: 'Desktop app',
		icon: MonitorIcon,
	},
	[Variant.MOBILE]: {
		label: 'Mobile app',
		icon: PhoneAndroidIcon,
	},
	[Variant.EMBEDDED]: {
		label: 'Embedded wallet',
		icon: SettingsEthernetIcon,
	},
	[Variant.HARDWARE]: {
		label: 'Hardware wallet',
		icon: HardwareIcon,
	},
} as const satisfies Record<Variant, { label: string; icon: string }>

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
