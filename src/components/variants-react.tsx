import type { SvgIconComponent } from '@mui/icons-material'

import LanguageIcon from '@mui/icons-material/Language'
import MemoryIcon from '@mui/icons-material/Memory'
import MonitorIcon from '@mui/icons-material/Monitor'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'

import { Variant } from '@/schema/variants'

/**
 * @returns A React SVG icon representing the given variant.
 */
export function variantToIcon(variant: Variant): SvgIconComponent {
	// We return the direct MUI icon component. Consumers can style via the parent element.
	switch (variant) {
		case Variant.BROWSER:
			return LanguageIcon
		case Variant.DESKTOP:
			return MonitorIcon
		case Variant.MOBILE:
			return PhoneAndroidIcon
		case Variant.EMBEDDED:
			return SettingsEthernetIcon
		case Variant.HARDWARE:
			return MemoryIcon
	}
}
