import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import LanguageIcon from '@mui/icons-material/Language'
import MonitorIcon from '@mui/icons-material/Monitor'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet'
import MemoryIcon from '@mui/icons-material/Memory'
import type { SvgIconComponent } from '@mui/icons-material'
import { Variant } from '@/schema/variants'
import React from 'react'

/**
 * @returns An SVG icon representing the given variant.
 */
export function variantToIcon(variant: Variant): SvgIconComponent {
	// Create styled components that correctly inherit colors from parent
	const StyledLanguageIcon = React.forwardRef((props: any, ref) => (
		<LanguageIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	))

	const StyledMonitorIcon = React.forwardRef((props: any, ref) => (
		<MonitorIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	))

	const StyledPhoneAndroidIcon = React.forwardRef((props: any, ref) => (
		<PhoneAndroidIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	))

	const StyledSettingsEthernetIcon = React.forwardRef((props: any, ref) => (
		<SettingsEthernetIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	))

	const StyledMemoryIcon = React.forwardRef((props: any, ref) => (
		<MemoryIcon ref={ref} {...props} sx={{ color: 'currentcolor', ...props.sx }} />
	))

	switch (variant) {
		case Variant.BROWSER:
			return StyledLanguageIcon as unknown as SvgIconComponent
		case Variant.DESKTOP:
			return StyledMonitorIcon as unknown as SvgIconComponent
		case Variant.MOBILE:
			return StyledPhoneAndroidIcon as unknown as SvgIconComponent
		case Variant.EMBEDDED:
			return StyledSettingsEthernetIcon as unknown as SvgIconComponent
		case Variant.HARDWARE:
			return StyledMemoryIcon as unknown as SvgIconComponent
	}
}
