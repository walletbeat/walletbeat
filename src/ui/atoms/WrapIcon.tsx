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
	sx?: React.CSSProperties
	children?: React.ReactNode
}): React.JSX.Element {
	return (
		<div className="flex flex-row gap-0" style={sx}>
			{flexBeforeAndAfter === undefined ? (
				<div
					className="flex-0"
					style={{
						minWidth: iconWidth,
						maxWidth: iconWidth,
						display: 'block',
						textAlign: 'center',
						fontSize: iconFontSize,
					}}
				>
					{icon}
				</div>
			) : (
				<div
					className={`flex-0`}
					style={{
						minWidth: iconWidth,
						maxWidth: iconWidth,
						display: 'flex',
						fontSize: iconFontSize,
					}}
				>
					<div className={`flex-${flexBeforeAndAfter[0]}`} />
					<div className="flex-0">{icon}</div>
					<div className={`flex-${flexBeforeAndAfter[1]}`} />
				</div>
			)}
			<div className="flex-1">{children}</div>
		</div>
	)
}
