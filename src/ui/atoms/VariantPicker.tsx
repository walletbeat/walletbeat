import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import type * as React from 'react'
import { Box, Tooltip } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { IconButton } from './IconButton'
import theme from '../../components/ThemeRegistry/theme'
import { useEffect, useState } from 'react'

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
	const [isDarkMode, setIsDarkMode] = useState(true)

	// Check if we're in dark mode whenever the component renders
	useEffect(() => {
		// Fallback to checking the document class
		setIsDarkMode(document.documentElement.classList.contains('dark'))
	}, [])

	return (
		<Box key={pickerId} display="flex" flexDirection={flexDirection} gap={gap}>
			{nonEmptyMap(variants, variant => {
				let opacity = opacityDefault
				const isSelected = pickedVariant === variant.id

				if (pickedVariant !== null) {
					opacity = opacityFaded
					if (isSelected) {
						opacity = opacityPicked
					}
				}

				return (
					<Tooltip key={variant.id} title={variant.tooltip} arrow={true} disableInteractive={true}>
						<Box flexDirection="row" display="flex" alignItems="center">
							{variant.click === undefined ? (
								<variant.icon
									data-selected={isSelected}
									sx={{
										opacity,
									}}
								/>
							) : (
								<IconButton
									onClick={variant.click}
									sx={{
										opacity,
									}}
								>
									<variant.icon data-selected={isSelected} />
								</IconButton>
							)}
						</Box>
					</Tooltip>
				)
			})}
		</Box>
	)
}
