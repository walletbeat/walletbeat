import type React from 'react'
import { Box, Link, type TypographyOwnProps } from '@mui/material'
import { useState } from 'react'
import type SvgIcon from '@mui/material/SvgIcon'

export function IconLink({
	href,
	IconComponent,
	target = undefined,
	gap = '0.25rem',
	color = undefined,
	style = undefined,
	rel = 'noopener noreferrer nofollow',
	children = undefined,
}: {
	href: string
	IconComponent: typeof SvgIcon
	target?: React.ComponentProps<typeof Link>['target']
	gap?: React.ComponentProps<typeof Box>['gap']
	color?: TypographyOwnProps['color']
	style?: React.CSSProperties
	rel?: string
	children?: React.ReactNode
}): React.JSX.Element {
	const [hovered, setHovered] = useState(false)
	return (
		<Box component="span" display="inline-block">
			<Link
				href={href}
				target={target}
				rel={rel}
				color={color}
				style={style}
				display="flex"
				flexDirection="row"
				gap={gap}
				alignItems="baseline"
				underline="none"
				onMouseEnter={() => {
					setHovered(true)
				}}
				onMouseLeave={() => {
					setHovered(false)
				}}
			>
				<IconComponent color="inherit" fontSize="inherit" display="inline-block" />
				<Box
					component="span"
					display="inline-block"
					sx={{ textDecoration: hovered ? 'underline' : 'inherit' }}
				>
					{children}
				</Box>
			</Link>
		</Box>
	)
}
