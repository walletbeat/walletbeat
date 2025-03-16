import type { FullyQualifiedReference } from '@/schema/reference'
import type { LabeledUrl } from '@/schema/url'
import {
	Divider,
	styled,
	Tooltip,
	tooltipClasses,
	Typography,
	type TooltipProps,
} from '@mui/material'
import React from 'react'
import { ExternalLink } from './ExternalLink'
import { MarkdownTypography } from './MarkdownTypography'

const ReferenceStyledTooltip = styled(({ className, ...props }: TooltipProps) => (
	<Tooltip {...props} classes={{ popper: className }} />
))({
	[`& .${tooltipClasses.tooltip}`]: {
		minWidth: '400px',
	},
})

export function ReferenceTooltip({
	ref,
	url,
	showExplanation = true,
	children,
}: {
	ref: FullyQualifiedReference
	url: LabeledUrl
	showExplanation?: boolean
	children: React.ComponentProps<typeof ReferenceStyledTooltip>['children']
}): React.JSX.Element {
	return (
		<ReferenceStyledTooltip
			title={
				<React.Fragment key={url.url}>
					{!showExplanation || ref.explanation === undefined ? null : (
						<>
							<MarkdownTypography variant="caption">{ref.explanation}</MarkdownTypography>
							<Divider
								orientation="horizontal"
								variant="middle"
								flexItem={true}
								sx={{
									marginLeft: '10%',
									marginRight: '10%',
									marginTop: '0.5rem',
									marginBottom: '0.5rem',
									filter: 'invert(100%)',
									opacity: 0.8,
								}}
							/>
						</>
					)}
					<Typography variant="caption" sx={{ opacity: 0.95 }}>
						Source: <ExternalLink url={url} />
					</Typography>
				</React.Fragment>
			}
			arrow={true}
		>
			{children}
		</ReferenceStyledTooltip>
	)
}
