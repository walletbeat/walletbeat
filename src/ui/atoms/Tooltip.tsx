import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode, JSX, CSSProperties } from 'react'

export interface TooltipProps {
	content: ReactNode
	children: ReactNode
	side?: RadixTooltip.TooltipContentProps['side']
	contentClassName?: string
	contentStyle?: CSSProperties
}

export function Tooltip({
	content,
	children,
	side = 'top',
	contentClassName,
	contentStyle,
}: TooltipProps): JSX.Element {
	const baseClass = 'bg-black text-white p-2 rounded text-sm z-50'
	const combinedClass: string =
		typeof contentClassName === 'string' && contentClassName.length > 0
			? `${baseClass} ${contentClassName}`
			: baseClass
	return (
		<RadixTooltip.Provider>
			<RadixTooltip.Root delayDuration={0}>
				<RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
				<RadixTooltip.Content
					side={side}
					sideOffset={5}
					className={combinedClass}
					style={contentStyle}
				>
					{content}
					<RadixTooltip.Arrow className="fill-black" />
				</RadixTooltip.Content>
			</RadixTooltip.Root>
		</RadixTooltip.Provider>
	)
}
