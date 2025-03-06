import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import type React from 'react'
import { Box, Tooltip } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { IconButton } from './IconButton'
import theme from '../../components/ThemeRegistry/theme'

export interface PickableVariant<V extends string> {
	id: V
	icon: SvgIconComponent
	tooltip: string | React.ReactNode
	colorTransform?: (color: string | undefined) => string
	click?: () => void
}

export interface VariantPickerProps<V extends string> {
	pickerId: string
	variants: NonEmptyArray<PickableVariant<V>>
	pickedVariant: V | null
	opacityFaded?: number
	opacityDefault?: number
	opacityPicked?: number
	colorPicked?: string
	flexDirection?: React.ComponentProps<typeof Box>['flexDirection']
	gap?: React.ComponentProps<typeof Box>['gap']
}

export function VariantPicker<V extends string>({
	pickerId,
	variants,
	pickedVariant = null,
	opacityFaded = 0.35,
	opacityDefault = 0.85,
	opacityPicked = 1.0,
	colorPicked = 'primary.light',
	flexDirection = 'row',
	gap = '0px',
}: VariantPickerProps<V>): React.JSX.Element {
	return (
		<Box key={pickerId} display="flex" flexDirection={flexDirection} gap={gap}>
			{nonEmptyMap(variants, variant => {
				let opacity = opacityDefault
				let color = undefined
				if (pickedVariant !== null) {
					opacity = opacityFaded
					if (pickedVariant === variant.id) {
						opacity = opacityPicked
						color = colorPicked
					}
				}
				if (variant.colorTransform !== undefined) {
					if (color === 'primary.light') {
						color = theme.palette.primary.light
					}
					color = variant.colorTransform(color)
				}
				return (
					<Tooltip key={variant.id} title={variant.tooltip} arrow={true} disableInteractive={true}>
						<Box flexDirection="row" display="flex" alignItems="center">
							{variant.click === undefined ? (
								<variant.icon
									sx={{
										opacity,
										color,
									}}
								/>
							) : (
								<IconButton
									onClick={variant.click}
									sx={{
										opacity,
										color,
									}}
								>
									<variant.icon />
								</IconButton>
							)}
						</Box>
					</Tooltip>
				)
			})}
		</Box>
	)
}
