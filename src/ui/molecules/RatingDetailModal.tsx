/* eslint-disable @typescript-eslint/no-explicit-any -- Disabled for complex typing with attribute groups */
import React from 'react'
import { Modal, Button, useMediaQuery, useTheme } from '@mui/material'
import type { Theme } from '@mui/material'
import { Rating, type AttributeGroup } from '@/schema/attributes'
import type { EvaluationTree } from '@/schema/attribute-groups'

interface RatingDetailModalProps {
	open: boolean
	onClose: () => void
	attrGroup: AttributeGroup<any>
	evalTree: EvaluationTree
	attributeRatings: Array<{ rating: Rating; id: string }>
}

// Helper function to get readable name for attribute IDs
function getAttributeName(attrId: string): string {
	// Convert camelCase to Title Case with spaces
	return attrId
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, str => str.toUpperCase())
		.trim()
}

// Helper function to get rating color based on theme
function getRatingColor(rating: Rating, theme: Theme): string {
	switch (rating) {
		case Rating.PASS:
			return '#2ecc71' // Green
		case Rating.PARTIAL:
			return '#f1c40f' // Yellow
		case Rating.FAIL:
			return '#e74c3c' // Red
		case Rating.UNRATED:
		case Rating.EXEMPT:
			return '#bdc3c7' // Gray
	}
}

// Helper function to get human-readable rating text
function getRatingText(rating: Rating): string {
	switch (rating) {
		case Rating.PASS:
			return 'Pass'
		case Rating.PARTIAL:
			return 'Partial'
		case Rating.FAIL:
			return 'Fail'
		case Rating.UNRATED:
			return 'Unrated'
		case Rating.EXEMPT:
			return 'Exempt'
	}
}

export function RatingDetailModal({
	open,
	onClose,
	attrGroup,
	evalTree,
	attributeRatings,
}: RatingDetailModalProps): React.ReactElement {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	const [highlightedSlice, setHighlightedSlice] = React.useState<number | null>(null)

	// Calculate overall score
	let overallScore = 0
	try {
		// Get the category object based on attribute group ID
		const categoryKey = attrGroup.id as keyof EvaluationTree
		const categoryData = evalTree[categoryKey]

		// Only calculate score if we have a score function
		if (typeof attrGroup.score === 'function') {
			// Use the category data directly since null checks are handled in the score function
			const result = attrGroup.score(categoryData)

			// Check for valid result with score property
			if (result != null && typeof result === 'object' && 'score' in result) {
				overallScore = result.score
			}
		}
	} catch (e) {
		// Silently handle errors in score calculation
		overallScore = 0
	}

	// Create SVG slices for the enlarged chart
	const createEnlargedSlices = (): React.ReactNode[] => {
		const slices = []
		const attributeCount = attributeRatings.length > 0 ? attributeRatings.length : 4
		const centerX = 150
		const centerY = 150
		const radius = 120
		const gapAngle = 2 // Gap in degrees

		const sliceAngle = 360 / attributeCount - gapAngle

		for (let i = 0; i < attributeCount; i++) {
			const startAngle = i * (sliceAngle + gapAngle)
			const endAngle = startAngle + sliceAngle

			// Convert angles to radians
			const startRad = ((startAngle - 90) * Math.PI) / 180
			const endRad = ((endAngle - 90) * Math.PI) / 180

			// Calculate coordinates
			const x1 = centerX + radius * Math.cos(startRad)
			const y1 = centerY + radius * Math.sin(startRad)
			const x2 = centerX + radius * Math.cos(endRad)
			const y2 = centerY + radius * Math.sin(endRad)

			// Create path for the slice
			const largeArcFlag = sliceAngle > 180 ? 1 : 0

			const pathData = `
                M ${centerX} ${centerY}
                L ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
            `

			const rating = attributeRatings[i]?.rating ?? Rating.UNRATED
			const sliceColor = getRatingColor(rating, theme)

			// Add the slice
			slices.push(
				<path
					key={i}
					d={pathData}
					fill={sliceColor}
					stroke="#ffffff"
					strokeWidth="2"
					style={{
						opacity: highlightedSlice === null || highlightedSlice === i ? 1 : 0.4,
						transition: 'opacity 0.2s ease-in-out',
						cursor: 'pointer',
					}}
					onMouseEnter={() => {
						handleMouseEnter(i)
					}}
					onMouseLeave={handleMouseLeave}
				/>,
			)
		}

		return slices
	}

	// Handlers for hover events
	const handleMouseEnter = (index: number): void => {
		setHighlightedSlice(index)
	}

	const handleMouseLeave = (): void => {
		setHighlightedSlice(null)
	}

	return (
		<Modal open={open} onClose={onClose} aria-labelledby="rating-detail-modal-title">
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95vw] max-h-[90vh] overflow-auto bg-white dark:bg-[#292C34] text-[#292C34] dark:text-[#FAFDFF] shadow-2xl rounded-lg p-6 sm:p-4">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-medium" id="rating-detail-modal-title">
						{attrGroup.displayName} - {Math.round(overallScore * 100)}% Overall
					</h2>
					<Button onClick={onClose} variant="outlined" size="small">
						Close
					</Button>
				</div>

				<div
					className={`flex ${isMobile ? 'flex-col items-center' : 'flex-row items-start'} gap-4`}
				>
					{/* Chart */}
					<div className="w-[280px] h-[280px] flex-shrink-0 rounded p-1">
						<svg viewBox="0 0 300 300" width="100%" height="100%">
							{createEnlargedSlices()}
						</svg>
					</div>

					{/* Attribute details */}
					<div className="flex-1 w-full">
						<h3 className="font-bold mb-2 text-base">Attribute Details:</h3>
						{attributeRatings.length > 0 ? (
							<div className="flex flex-col gap-2 max-h-[350px] sm:max-h-[300px] overflow-y-auto pr-1">
								{attributeRatings.map((attr, index) => (
									<div
										key={attr.id}
										className={`flex items-center p-2 rounded cursor-pointer text-sm ${
											highlightedSlice === index
												? 'bg-gray-200 dark:bg-gray-700'
												: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
										}`}
										onMouseEnter={() => {
											handleMouseEnter(index)
										}}
										onMouseLeave={handleMouseLeave}
									>
										<div
											className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300 dark:border-gray-600"
											style={{ backgroundColor: getRatingColor(attr.rating, theme) }}
										/>
										<span className="flex-1 text-sm">{getAttributeName(attr.id)}</span>
										<div
											className="px-2 py-1 rounded min-w-[50px] text-center text-xs font-bold"
											style={{
												backgroundColor: getRatingColor(attr.rating, theme),
												color: theme.palette.getContrastText(getRatingColor(attr.rating, theme)),
											}}
										>
											{getRatingText(attr.rating)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400 text-sm">
								No attribute ratings available for this category.
							</p>
						)}
					</div>
				</div>
			</div>
		</Modal>
	)
}
