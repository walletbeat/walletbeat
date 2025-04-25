import type { SvgIconComponent } from '@mui/icons-material'

import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'

import { IconButton } from './IconButton'
import { Tooltip } from './Tooltip'

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
	flexDirection?: React.CSSProperties['flexDirection']
	gap?: React.CSSProperties['gap']
}

export function VariantPicker<V extends string>({
	pickerId,
	variants,
	pickedVariant = null,
	opacityFaded = 0.35,
	opacityDefault = 0.85,
	opacityPicked = 1.0,
	// colorPicked = 'primary.light',
	flexDirection = 'row',
	gap = '0px',
}: VariantPickerProps<V>): React.JSX.Element {
	return (
		<div key={pickerId} className="flex" style={{ flexDirection, gap }}>
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
					<Tooltip key={variant.id} content={variant.tooltip}>
						<div className="flex flex-row items-center">
							{variant.click === undefined ? (
								<variant.icon
									data-selected={isSelected}
									style={{
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
						</div>
					</Tooltip>
				)
			})}
		</div>
	)
}
