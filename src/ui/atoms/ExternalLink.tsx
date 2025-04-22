import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Link, type TypographyOwnProps } from '@mui/material'
import type React from 'react'
import { useState } from 'react'

import { labeledUrl, type Url } from '@/schema/url'

export function ExternalLink({
	url,
	defaultLabel = undefined,
	color = 'primary.main',
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
		<span className="inline-block">
			<Link
				href={labeled.url}
				target="_blank"
				rel={rel}
				className={`text-accent`} // overwrite mui primary color
				style={{
					...style,
				}}
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
				sx={{
					color,
				}}
			>
				<span
					className="inline-block"
					style={{ textDecoration: hovered ? 'underline' : 'inherit' }}
				>
					{children ?? labeled.label}
				</span>{' '}
				<OpenInNewRoundedIcon color="inherit" fontSize="inherit" />
			</Link>
		</span>
	)
}
