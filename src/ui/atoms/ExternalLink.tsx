import type React from 'react'
import { labeledUrl, type Url } from '@/schema/url'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Box, Link, type TypographyOwnProps } from '@mui/material'
import { useState } from 'react'

export function ExternalLink({
	url,
	defaultLabel = undefined,
	color = undefined,
	style = undefined,
	rel = 'noopener noreferrer nofollow',
	children = undefined,
}: {
	url: Url
	defaultLabel?: string
	color?: TypographyOwnProps['color']
	style?: React.CSSProperties
	rel?: string
	children?: React.ReactNode
}): React.JSX.Element {
	const labeled = labeledUrl(url, defaultLabel)
	const [hovered, setHovered] = useState(false)
	return (
		<Box component="span" display="inline-block">
			<Link
				href={labeled.url}
				target="_blank"
				rel={rel}
				color={color}
				style={style}
				display="flex"
				flexDirection="row"
				gap="2px"
				alignItems="baseline"
				underline="none"
				onMouseEnter={() => {
					setHovered(true)
				}}
				onMouseLeave={() => {
					setHovered(false)
				}}
			>
				<Box
					component="span"
					display="inline-block"
					sx={{ textDecoration: hovered ? 'underline' : 'inherit' }}
				>
					{children ?? labeled.label}
				</Box>{' '}
				<OpenInNewRoundedIcon color="inherit" fontSize="inherit" />
			</Link>
		</Box>
	)
}
