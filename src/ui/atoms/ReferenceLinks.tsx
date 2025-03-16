import { type FullyQualifiedReference } from '@/schema/reference'
import { type LabeledUrl } from '@/schema/url'
import { Box, Link, Typography } from '@mui/material'
import React from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LinkIcon from '@mui/icons-material/Link'

/**
 * Component to display reference links with explanations
 */
export function ReferenceLinks({
	references,
	explanation,
}: {
	references: FullyQualifiedReference[] | any[] | undefined | null
	explanation?: string
}): React.JSX.Element {
	// Check if references is undefined, null, or empty
	if (!references || references.length === 0) {
		return <></>
	}

	// Debug check - more comprehensive logging
	console.log("ReferenceLinks component receiving:", 
		JSON.stringify({
			referencesLength: references.length,
			referencesType: Array.isArray(references) ? 'array' : typeof references,
			firstReference: references[0] ? {
				hasUrls: !!references[0].urls,
				urlsLength: references[0].urls?.length,
				hasExplanation: !!references[0].explanation,
				urls: references[0].urls || references[0].url
			} : null
		}, null, 2)
	);
	
	// Make sure we have valid references with urls
	const validReferences = references.filter(ref => {
		// Check if the reference has a valid url property
		const hasValidUrl = 
			(ref.urls && Array.isArray(ref.urls) && ref.urls.length > 0) ||
			(ref.url && typeof ref.url === 'string');
		
		if (!hasValidUrl) {
			console.warn("Invalid reference without URL:", ref);
		}
		
		return hasValidUrl;
	});
	
	if (validReferences.length === 0) {
		console.warn("No valid references with URLs found");
		return <></>;
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
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
				{validReferences.map((ref, refIndex) => (
					<Box key={refIndex}>
						{/* Reference links */}
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
							{/* Check if the reference has urls array (FullyQualifiedReference structure) */}
							{ref.urls ? (
								// Map over the urls array within the reference
								ref.urls.map((url: LabeledUrl, urlIndex: number) => (
									<Link
										key={`${refIndex}-${urlIndex}`}
										href={url.url}
										target="_blank"
										rel="noopener noreferrer"
										sx={{
											display: 'inline-flex',
											alignItems: 'center',
											fontSize: '0.75rem',
											gap: 0.5,
											color: 'primary.main',
											textDecoration: 'none',
											'&:hover': { textDecoration: 'underline' }
										}}
									>
										<LinkIcon fontSize="inherit" />
										{url.label}
									</Link>
								))
							) : (
								// Fallback for legacy format references with direct url property
								<Link
									href={ref.url}
									target="_blank"
									rel="noopener noreferrer"
									sx={{
										display: 'inline-flex',
										alignItems: 'center',
										fontSize: '0.75rem',
										gap: 0.5,
										color: 'primary.main',
										textDecoration: 'none',
										'&:hover': { textDecoration: 'underline' }
									}}
								>
									<LinkIcon fontSize="inherit" />
									{ref.label || ref.url}
								</Link>
							)}
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
									mb: 0.5
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
						fontStyle: 'italic'
					}}
				>
					{explanation}
				</Typography>
			)}
		</Box>
	)
}
