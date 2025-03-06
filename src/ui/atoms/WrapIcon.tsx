import { Box } from '@mui/material'
import type React from 'react'
import type theme from '../../components/ThemeRegistry/theme'

export function WrapIcon({
	icon,
	iconWidth,
	iconFontSize = 'inherit',
	flexBeforeAndAfter = undefined,
	sx = undefined,
	children = undefined,
}: {
	icon: React.ReactNode
	iconWidth: string
	iconFontSize: typeof theme.typography.body1.fontSize
	flexBeforeAndAfter?: [number, number]
	sx?: React.ComponentProps<typeof Box>['sx']
	children?: React.ReactNode
}): React.JSX.Element {
	return (
		<Box display="flex" flexDirection="row" gap="0px" sx={sx}>
			{flexBeforeAndAfter === undefined ? (
				<Box
					flex="0"
					minWidth={iconWidth}
					maxWidth={iconWidth}
					display="block"
					textAlign="center"
					fontSize={iconFontSize}
				>
					{icon}
				</Box>
			) : (
				<Box
					flex="0"
					minWidth={iconWidth}
					maxWidth={iconWidth}
					display="flex"
					fontSize={iconFontSize}
				>
					<Box flex={flexBeforeAndAfter[0]} />
					<Box flex="0">{icon}</Box>
					<Box flex={flexBeforeAndAfter[1]} />
				</Box>
			)}
			<Box flex="1">{children}</Box>
		</Box>
	)
}
