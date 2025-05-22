import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkIcon from '@mui/icons-material/Link';
import { Link, Typography } from '@mui/material';
import type React from 'react';

import type { FullyQualifiedReference } from '@/schema/reference';
import type { LabeledUrl } from '@/schema/url';

/**
 * Component to display reference links with explanations
 */
export function ReferenceLinks({
	references,
	explanation,
}: {
	references: FullyQualifiedReference[];
	explanation?: string;
}): React.JSX.Element {
	if (references.length === 0) {
		return <></>;
	}

	return (
		<div className="pt-2 mt-1 border-t border-gray-200 flex flex-col gap-1 text-primary">
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
			<div className="flex flex-col gap-1">
				{references.map((ref, refIndex) => (
					<div key={refIndex}>
						{/* Reference links */}
						<div className="flex flex-wrap gap-1 mb-1">
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
						</div>

						{/* Reference explanation if available in the reference object */}
						{ref.explanation !== undefined && ref.explanation !== '' && (
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
					</div>
				))}
			</div>

			{/* Global explanation if provided to the component */}
			{explanation !== undefined && explanation !== '' && (
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
		</div>
	);
}
