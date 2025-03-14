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
				mt: 2, 
				pt: 2, 
				borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
			}}
		>
			<Typography variant="subtitle2" sx={{ 
				display: 'flex', 
				alignItems: 'center',
				gap: 0.5,
				mb: 1,
				color: 'text.secondary'
			}}>
				<InfoOutlinedIcon fontSize="small" />
				Sources
			</Typography>
			
			{references.map((ref, index) => (
				<Box key={index} sx={{ mb: 1.5 }}>
					{/* Handle both old reference format (url, explanation) and new format (urls array) */}
					{ref.urls ? (
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
							{ref.urls.map((urlObj, urlIndex) => (
								<Link 
									key={urlIndex} 
									href={urlObj.url} 
									target="_blank" 
									rel="noopener noreferrer"
									sx={{ 
										display: 'inline-flex',
										alignItems: 'center',
										fontSize: '0.85rem',
										backgroundColor: 'rgba(25, 118, 210, 0.08)',
										borderRadius: '4px',
										padding: '2px 8px',
										gap: 0.5,
										textDecoration: 'none',
										'&:hover': { 
											textDecoration: 'underline',
											backgroundColor: 'rgba(25, 118, 210, 0.12)' 
										}
									}}
								>
									<LinkIcon fontSize="inherit" />
									{urlObj.label}
								</Link>
							))}
						</Box>
					) : ref.url ? (
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
							<Link 
								href={ref.url} 
								target="_blank" 
								rel="noopener noreferrer"
								sx={{ 
									display: 'inline-flex',
									alignItems: 'center',
									fontSize: '0.85rem',
									backgroundColor: 'rgba(25, 118, 210, 0.08)',
									borderRadius: '4px',
									padding: '2px 8px',
									gap: 0.5,
									textDecoration: 'none',
									'&:hover': { 
										textDecoration: 'underline',
										backgroundColor: 'rgba(25, 118, 210, 0.12)' 
									}
								}}
							>
								<LinkIcon fontSize="inherit" />
								{typeof ref.url === 'string' ? new URL(ref.url).hostname : ref.url.label || new URL(ref.url.url).hostname}
							</Link>
						</Box>
					) : null}
					
					{ref.explanation && (
						<Typography 
							variant="body2" 
							sx={{ 
								color: 'text.secondary', 
								ml: 0.5,
								fontSize: '0.85rem',
								fontStyle: 'italic'
							}}
						>
							{ref.explanation}
						</Typography>
					)}
				</Box>
			))}
		</Box>
	)
}
