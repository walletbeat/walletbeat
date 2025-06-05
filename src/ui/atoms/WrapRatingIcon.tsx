import type React from 'react'

import { type Rating, ratingToIcon } from '@/schema/attributes'

import { subsectionIconWidth } from '../../components/constants'
import { WrapIcon } from './WrapIcon'

export function WrapRatingIcon({
	rating,
	children = undefined,
}: {
	rating: Rating
	children?: React.ReactNode
}): React.JSX.Element {
	return (
		<WrapIcon
			icon={ratingToIcon(rating)}
			iconWidth={subsectionIconWidth}
			iconFontSize="inherit"
			flexBeforeAndAfter={[2, 7]}
		>
			{children}
		</WrapIcon>
	)
}
