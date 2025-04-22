import type SvgIcon from '@mui/material/SvgIcon'
import type React from 'react'

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
	target?: string
	gap?: string
	color?: string
	style?: React.CSSProperties
	rel?: string
	children?: React.ReactNode
}): React.JSX.Element {
	// Convert gap to Tailwind spacing class
	const gapClass = gap === '0.25rem' ? 'gap-1' : 'gap-2'

	// Default color to text-primary
	const colorClass = color ?? 'text-primary'

	return (
		<span className="inline-block">
			<a
				href={href}
				target={target}
				rel={rel}
				style={style}
				className={`inline-flex flex-row ${gapClass} items-baseline no-underline ${colorClass} hover:underline`}
			>
				<IconComponent className="inline-block" fontSize="inherit" />
				<span className="inline-block">{children}</span>
			</a>
		</span>
	)
}
