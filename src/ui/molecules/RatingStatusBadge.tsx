import theme from '@/components/ThemeRegistry/theme'
import { type Rating, ratingToColor, ratingToText } from '@/schema/attributes'
import type { FC } from 'react'

export const RatingStatusBadge: FC<{ rating: Rating }> = ({ rating }) => (
	<div
		className="px-2 py-1 rounded min-w-[50px] text-center text-xs font-bold"
		style={{
			backgroundColor: ratingToColor(rating),
			color: theme.palette.primary.main,
		}}
	>
		{ratingToText(rating)}
	</div>
)
