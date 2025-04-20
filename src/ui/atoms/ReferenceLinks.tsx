import type { FullyQualifiedReference } from '@/schema/reference'
import type { LabeledUrl } from '@/schema/url'
import { Box, Link, Typography } from '@mui/material'
import type React from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LinkIcon from '@mui/icons-material/Link'

/**
 * Component to display reference links with explanations
 */
export function ReferenceLinks({
	references,
	explanation,
}: {
	references: FullyQualifiedReference[]
	explanation?: string
}): React.JSX.Element {
	// Check if references is undefined, null, or empty
	if (!references || references.length === 0) {
		return <></>
	}

	return (
		<Box
			sx={{
				pt: 1,
				mt: 0.5,
				borderTop: '1px solid rgba(0,0,0,0.1)',
				display: 'flex',
				flexDirection: 'column',
				gap: 0.5,
				color: 'var(--text-primary)',
			}}
		>
			{/* References header */}
			<Typography
				variant="caption"
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 0.5,
					color: 'var(--text-primary)',
					fontWeight: 'medium',
				}}
			>
				<InfoOutlinedIcon sx={{ fontSize: '0.875rem' }} />
				Source
			</Typography>

			{/* References content */}
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
				{references.map((ref, refIndex) => (
					<Box key={refIndex}>
						{/* Reference links */}
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
							{ref.urls.map((url: LabeledUrl, urlIndex: number) => (
								<Link
									key={`${refIndex}-${urlIndex}`}
									href={url.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-accent"
									sx={{
										display: 'inline-flex',
										alignItems: 'center',
										fontSize: '0.75rem',
										gap: 0.5,
										// color: 'primary.main', //remove mui styling for now
										textDecoration: 'none',
										'&:hover': { textDecoration: 'underline' },
									}}
								>
									<LinkIcon fontSize="inherit" />
									{url.label}
								</Link>
							))}
						</Box>

						{/* Reference explanation if available in the reference object */}
						{ref.explanation && (
							<Typography
								variant="caption"
								sx={{
									color: 'var(--text-primary)',
									display: 'block',
									fontSize: '0.75rem',
									lineHeight: 1.2,
									fontStyle: 'italic',
									mb: 0.5,
								}}
							>
								{ref.explanation}
							</Typography>
						)}
					</Box>
				))}
			</Box>

			{/* Global explanation if provided to the component */}
			{explanation && (
				<Typography
					variant="caption"
					sx={{
						color: 'var(--text-primary)',
						display: 'block',
						fontSize: '0.7rem',
						lineHeight: 1.2,
						fontStyle: 'italic',
					}}
				>
					{explanation}
				</Typography>
			)}
		</Box>
	)
}
