import { type ReactElement, useState } from 'react'

import { mapNonExemptGroupAttributes, numNonExemptGroupAttributes } from '@/schema/attribute-groups'
import {
	type AttributeGroup,
	type EvaluatedGroup,
	ratingToColor,
	type ValueSet,
} from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { cx } from '@/utils/cx'

import { RatingDetailModal } from '../molecules/RatingDetailModal'

// Pizza Slice Chart Component (inspired by WalletTableStylingExample)
export const PizzaSliceChart = <Vs extends ValueSet>({
	attrGroup,
	evalGroup,
	isSupported = true,
	wallet,
}: {
	attrGroup: AttributeGroup<Vs>
	evalGroup: EvaluatedGroup<Vs>
	isSupported?: boolean
	wallet: RatedWallet
}): ReactElement => {
	// Add state for the modal
	const [modalOpen, setModalOpen] = useState(false)

	const attrGroupScore = attrGroup.score(evalGroup)
	if (attrGroupScore === null) {
		// All attributes in the group are exempt, can't render pie chart.
		return <></>
	}
	const attributeCount = numNonExemptGroupAttributes(evalGroup)

	const tooltipText = `${attrGroup.displayName}: ${Math.round(attrGroupScore.score * 100)}% (${attributeCount} attributes)`

	// Create SVG slices for cleaner rendering with gaps
	const createSlices = (): React.ReactNode[] => {
		const centerX = 50
		const centerY = 50
		const radius = 45
		const gapAngle = 2 // Gap in degrees
		const precision = 4 // Number of decimal places to round coordinates to

		const sliceAngle = 360 / attributeCount - gapAngle

		return mapNonExemptGroupAttributes(evalGroup, (evalAttr, index) => {
			const startAngle = index * (sliceAngle + gapAngle)
			const endAngle = startAngle + sliceAngle

			// Convert angles to radians
			const startRad = ((startAngle - 90) * Math.PI) / 180
			const endRad = ((endAngle - 90) * Math.PI) / 180

			// Calculate coordinates and round them
			const x1 = parseFloat((centerX + radius * Math.cos(startRad)).toFixed(precision))
			const y1 = parseFloat((centerY + radius * Math.sin(startRad)).toFixed(precision))
			const x2 = parseFloat((centerX + radius * Math.cos(endRad)).toFixed(precision))
			const y2 = parseFloat((centerY + radius * Math.sin(endRad)).toFixed(precision))

			// Create path for the slice
			const largeArcFlag = sliceAngle > 180 ? 1 : 0

			const pathData = `
				M ${centerX} ${centerY}
				L ${x1} ${y1}
				A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
				Z
			`

			return (
				<path
					key={evalAttr.attribute.id}
					d={pathData}
					fill={ratingToColor(evalAttr.evaluation.value.rating)}
					stroke="#ffffff"
					strokeWidth="1"
				/>
			)
		})
	}

	// Handle click on the pie chart
	const handlePieClick = (): void => {
		if (isSupported) {
			setModalOpen(true)
		}
	}

	// Create the pizza slice visualization with the correct number of slices
	return (
		<>
			<div className={cx('flex flex-col items-center', !isSupported ? 'opacity-40' : '')}>
				<div
					className={cx(
						'w-10 h-10 rounded-full bg-white overflow-hidden relative',
						isSupported ? 'cursor-pointer hover:shadow-md' : 'cursor-help',
					)}
					title={tooltipText}
					onClick={handlePieClick}
				>
					<svg viewBox="0 0 100 100" className="w-full h-full">
						{createSlices()}
					</svg>
				</div>
			</div>

			{/* Rating Detail Modal */}
			{isSupported && (
				<RatingDetailModal<Vs>
					open={modalOpen}
					onClose={() => {
						setModalOpen(false)
					}}
					attrGroup={attrGroup}
					evalGroup={evalGroup}
					wallet={wallet}
				/>
			)}
		</>
	)
}
