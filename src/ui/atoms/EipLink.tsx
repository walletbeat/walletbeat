import React, { useState } from 'react'
import { Box, Divider, Link, styled, Typography } from '@mui/material'
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip'
import { type Eip, eipEthereumDotOrgUrl, eipLabel, eipShortLabel } from '@/schema/eips'
import { MarkdownBox } from './MarkdownBox'
import { betaImagesRoot } from '@/constants'

const EipTooltip = styled(({ className, ...props }: TooltipProps) => (
	<Tooltip {...props} classes={{ popper: className }} />
))({
	[`& .${tooltipClasses.tooltip}`]: {
		minWidth: '400px',
	},
})

export function EipLink({
	eip,
	format,
}: {
	eip: Eip
	format: 'SHORT' | 'LONG'
}): React.JSX.Element {
	const [hovered, setHovered] = useState(false)

	return (
		<EipTooltip
			title={
				<React.Fragment key={`eip-tooltip-${eip.number}`}>
					<Typography
						variant="h4"
						sx={{
							marginTop: '0.5rem',
							marginBottom: '0.5rem',
						}}
					>
						{eipLabel(eip)}
					</Typography>
					<Divider
						orientation="horizontal"
						variant="middle"
						flexItem={true}
						sx={{
							marginLeft: '1%',
							marginRight: '1%',
							marginTop: '0rem',
							marginBottom: '0.5rem',
							filter: 'invert(100%)',
						}}
					/>
					<MarkdownBox markdownTransform={markdown => `**Summary**: ${markdown}`}>
						{eip.summaryMarkdown}
					</MarkdownBox>
					<Divider
						orientation="horizontal"
						variant="middle"
						flexItem={true}
						sx={{
							marginLeft: '20%',
							marginRight: '20%',
							marginTop: '0.5rem',
							marginBottom: '0.5rem',
							filter: 'invert(100%)',
						}}
					/>
					<MarkdownBox markdownTransform={markdown => `**Why?** ${markdown}`}>
						{eip.whyItMattersMarkdown}
					</MarkdownBox>
					{eip.noteMarkdown === undefined ? null : (
						<>
							<Divider
								orientation="horizontal"
								variant="middle"
								flexItem={true}
								sx={{
									marginLeft: '20%',
									marginRight: '20%',
									marginTop: '0.5rem',
									marginBottom: '0.5rem',
									filter: 'invert(100%)',
								}}
							/>
							<MarkdownBox markdownTransform={markdown => `**Note**: ${markdown}`}>
								{eip.noteMarkdown}
							</MarkdownBox>
						</>
					)}
				</React.Fragment>
			}
			sx={{
				maxWidth: '80%',
			}}
			arrow={true}
		>
			<Box component="span" display="inline-block">
				<Link
					href={eipEthereumDotOrgUrl(eip)}
					target="_blank"
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
					<Box component="span" display="inline-block" sx={{ filter: 'invert(100%)' }}>
						<img src={`${betaImagesRoot}/ethereum-logo.svg`} alt="" width={14} height={14} />
					</Box>
					<Box
						component="span"
						display="inline-block"
						sx={{ textDecoration: hovered ? 'underline' : 'underline dotted' }}
					>
						{format === 'SHORT' ? eipShortLabel(eip) : eipLabel(eip)}
					</Box>
				</Link>
			</Box>
		</EipTooltip>
	)
}
