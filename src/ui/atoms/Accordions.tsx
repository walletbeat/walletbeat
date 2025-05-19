import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	darken,
	useTheme,
} from '@mui/material'
import type React from 'react'
import { useState } from 'react'

import type { NonEmptyArray } from '@/types/utils/non-empty'

export interface AccordionData {
	id: string
	summary: React.ReactNode
	contents: React.ReactNode
}

/** Expandable set of Material Accordion controls. */
export function Accordions({
	accordions,
	borderRadius,
	interAccordionMargin = '1rem',
}: {
	accordions: NonEmptyArray<AccordionData>
	borderRadius: string
	interAccordionMargin?: string
}): React.JSX.Element {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})
	const theme = useTheme()

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
							expandIcon={<ExpandMoreIcon />}
							aria-controls={`${accordion.id}-content`}
							id={`${accordion.id}-header`}
							sx={{
								backgroundColor: theme.palette.background.paper,
								borderTopLeftRadius: blankTop ? borderRadius : '0px',
								borderTopRightRadius: blankTop ? borderRadius : '0px',
								borderBottomLeftRadius:
									!expanded[accordion.id] && blankBottom ? borderRadius : '0px',
								borderBottomRightRadius:
									!expanded[accordion.id] && blankBottom ? borderRadius : '0px',
							}}
						>
							{accordion.summary}
						</AccordionSummary>
						<AccordionDetails
							key={`${accordion.id}-details`}
							sx={{
								padding: '16px',
								backgroundColor:
									theme.palette.mode === 'light'
										? theme.palette.grey[100] // Light grey background for light mode
										: darken(theme.palette.background.paper, 0.1), // Dark grey for dark mode
								color:
									theme.palette.mode === 'light'
										? '#ffffff' // White text for light mode
										: theme.palette.text.primary, // Default primary text (light) for dark mode
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
