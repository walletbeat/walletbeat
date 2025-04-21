import { MarkdownBox } from '../atoms/MarkdownBox'
import { AnchorHeader } from '../atoms/AnchorHeader'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import type { Typography } from '@mui/material'

export default function FrequentlyAskedQuestion({
	question,
	anchor,
	questionTypographyProps = undefined,
	answerTypographyProps = undefined,
	children,
}: {
	question: string
	anchor: string
	questionTypographyProps?: React.ComponentProps<typeof Typography>
	answerTypographyProps?: React.ComponentProps<typeof Typography>
	children: string
}): React.JSX.Element {
	return (
		<div key={anchor}>
			<AnchorHeader id={anchor} {...questionTypographyProps}>
				<HelpOutlineIcon /> {question}
			</AnchorHeader>
			<MarkdownBox pTypography={answerTypographyProps}>{children}</MarkdownBox>
		</div>
	)
}
