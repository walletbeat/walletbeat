import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import type React from 'react'
import { useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'

import type { NonEmptyArray } from '@/types/utils/non-empty'

export interface AccordionData {
	id: string
	summary: string
	contents: React.ReactNode
}

/** Expandable set of Material Accordion controls. */
export function Accordions({
	accordions,
	borderRadius,
	summaryTypographyVariant = 'h1',
	interAccordionMargin = '1rem',
}: {
	accordions: NonEmptyArray<AccordionData>
	borderRadius: string
	summaryTypographyVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
	interAccordionMargin?: string
}): React.JSX.Element {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})

	const handleChange = (id: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
		setExpanded(prev => ({ ...prev, [id]: isExpanded }))
	}

	return (
		<>
			{accordions.map((accordion, index) => {
				const blankTop = index === 0 || expanded[accordions[index - 1].id] || expanded[accordion.id]
				const blankBottom =
					index === accordions.length - 1 ||
					expanded[accordions[index + 1].id] ||
					expanded[accordion.id]
				return (
					<Accordion
						key={accordion.id}
						disableGutters
						expanded={expanded[accordion.id] ?? false}
						onChange={handleChange(accordion.id)}
						sx={{
							backgroundColor: 'var(--background-secondary)',
							boxShadow: 'none',
							borderTopLeftRadius: blankTop ? borderRadius : '0px',
							borderTopRightRadius: blankTop ? borderRadius : '0px',
							borderBottomLeftRadius: !expanded[accordion.id] && blankBottom ? borderRadius : '0px',
							borderBottomRightRadius:
								!expanded[accordion.id] && blankBottom ? borderRadius : '0px',
							'&:not(:first-of-type)': {
								marginTop: interAccordionMargin,
							},
							'&:before': {
								display: 'none', // Remove the default top border
							},
						}}
					>
						<AccordionSummary
							key={`${accordion.id}-summary`}
							expandIcon={
								<div className="text-base text-primary">
									<LuChevronDown />
								</div>
							}
							aria-controls={`${accordion.id}-content`}
							id={`${accordion.id}-header`}
							sx={{
								color: 'var(--text-primary)',
								backgroundColor: 'var(--background-secondary)', //theme.palette.background.paper,
								borderTopLeftRadius: blankTop ? borderRadius : '0px',
								borderTopRightRadius: blankTop ? borderRadius : '0px',
								borderBottomLeftRadius:
									!expanded[accordion.id] && blankBottom ? borderRadius : '0px',
								borderBottomRightRadius:
									!expanded[accordion.id] && blankBottom ? borderRadius : '0px',
							}}
						>
							<Typography variant={summaryTypographyVariant}>{accordion.summary}</Typography>
						</AccordionSummary>
						<AccordionDetails
							key={`${accordion.id}-details`}
							sx={{
								padding: '16px',
								backgroundColor: 'var(--background-secondary)', //theme.palette.background.paper,
								// backgroundColor:
								// 	theme.palette.mode === 'light'
								// 		? theme.palette.grey[100] // Light grey background for light mode
								// 		: darken(theme.palette.background.paper, 0.1), // Dark grey for dark mode
								color: 'var(--text-secondary)', //theme.palette.text.primary,
								// theme.palette.mode === 'light'
								// ? '#ffffff' // White text for light mode
								// : theme.palette.text.primary, // Default primary text (light) for dark mode
								borderBottomLeftRadius: blankBottom ? borderRadius : '0px',
								borderBottomRightRadius: blankBottom ? borderRadius : '0px',
							}}
						>
							{accordion.contents}
						</AccordionDetails>
					</Accordion>
				)
			})}
		</>
	)
}
