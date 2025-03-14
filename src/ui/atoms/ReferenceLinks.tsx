import { type FullyQualifiedReference } from '@/schema/reference'
import { Box, Link, Typography } from '@mui/material'
import React from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LinkIcon from '@mui/icons-material/Link'

/**
 * Component to display reference links with explanations
 */
export function ReferenceLinks({
	references,
}: {
	references: FullyQualifiedReference[] | any[] | undefined | null
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
				color: 'var(--text-primary)'
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
					fontWeight: 'medium'
				}}
			>
				<InfoOutlinedIcon sx={{ fontSize: '0.875rem' }} />
				Source
			</Typography>
			
			{/* References content */}
			<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
				{references.map((ref, index) => (
					<Link
						key={index}
						href={ref.url}
						target="_blank"
						rel="noopener noreferrer"
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							fontSize: '0.75rem',
							gap: 0.5,
							color: 'var(--text-primary)',
							textDecoration: 'none',
							'&:hover': {
								textDecoration: 'underline'
							}
						}}
					>
						<LinkIcon fontSize="inherit" />
						{ref.label}
					</Link>
				))}
			</Box>
			
			{/* Reference explanation if provided */}
			{explanation && (
				<Typography
					variant="caption"
					sx={{
						color: 'var(--text-primary)',
						display: 'block',
						fontSize: '0.7rem',
						lineHeight: 1.2,
						fontStyle: 'italic'
					}}
				>
					{explanation}
				</Typography>
			)}
		</Box>
	)
}
