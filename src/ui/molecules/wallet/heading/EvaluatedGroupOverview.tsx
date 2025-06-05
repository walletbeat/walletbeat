import { useMediaQuery, useTheme } from '@mui/material'
import type React from 'react'
import { useEffect, useState } from 'react'

import { mapNonExemptGroupAttributes, numNonExemptGroupAttributes } from '@/schema/attribute-groups'
import { type EvaluatedGroup, ratingToColor, type ValueSet } from '@/schema/attributes'
import type { HardwareWalletModel } from '@/schema/features/profile'
import type { RatedWallet } from '@/schema/wallet'
import { cx } from '@/utils/cx'
import { toKebabCase } from '@/utils/kebab'

import { RatingStatusBadge } from '../../RatingStatusBadge'

interface EvaluatedGroupOverviewProps<Vs extends ValueSet> {
	wallet: RatedWallet
	// attrGroup: AttributeGroup<Vs>
	evalGroup: EvaluatedGroup<Vs>
	hardwareWalletModel?: HardwareWalletModel
}

export function EvaluatedGroupOverview<Vs extends ValueSet>({
	// attrGroup,
	evalGroup,
	wallet,
	hardwareWalletModel,
}: EvaluatedGroupOverviewProps<Vs>): React.ReactElement {
	const theme = useTheme()
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
	const [selectedModel, setSelectedModel] = useState<HardwareWalletModel | null>(
		hardwareWalletModel ?? null,
	)
	const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null)

	// Get hardware wallet models if applicable
	const hardwareModels = wallet.metadata.hardwareWalletModels ?? []
	const hasHardwareModels = hardwareModels.length > 0

	// Get the flagship model if available
	const flagshipModel = hasHardwareModels
		? (hardwareModels.find(model => model.isFlagship) ?? hardwareModels[0])
		: null

	// If no model is selected but we have models, default to the flagship
	useEffect(() => {
		if (selectedModel !== null && flagshipModel !== null && flagshipModel.id !== '') {
			setSelectedModel(flagshipModel)
		}
	}, [flagshipModel, selectedModel])

	// Create SVG slices for the enlarged chart
	const createEnlargedSlices = (): React.JSX.Element[] => {
		const attributeCount = numNonExemptGroupAttributes(evalGroup)
		const centerX = 150
		const centerY = 150
		const radius = 120
		const gapAngle = 2 // Gap in degrees
		const sliceAngle = 360 / attributeCount - gapAngle

		return mapNonExemptGroupAttributes(evalGroup, (evalAttr, i) => {
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

			return (
				<path
					key={i}
					d={pathData}
					fill={ratingToColor(evalAttr.evaluation.value.rating)}
					stroke='#ffffff'
					strokeWidth='2'
					style={{
						opacity: hoveredSliceIndex === null || hoveredSliceIndex === i ? 1 : 0.4,
						transition: 'opacity 0.2s ease-in-out',
						cursor: 'pointer',
					}}
					onMouseEnter={() => {
						setHoveredSliceIndex(i)
					}}
					onMouseLeave={() => {
						setHoveredSliceIndex(null)
					}}
				/>
			)
		})
	}

	return (
		<>
			<div
				className={cx(
					'flex',
					isSmallScreen ? 'flex-col items-center' : 'flex-row items-start',
					'gap-4',
				)}
			>
				{/* Chart */}
				<div className='w-[280px] h-[280px] flex-shrink-0 rounded p-1'>
					<svg viewBox='0 0 300 300' width='100%' height='100%'>
						{createEnlargedSlices()}
					</svg>
				</div>

				{/* Attribute details */}
				<div className='flex-1 w-full'>
					<h3 className='font-bold mb-2 text-base'>Attribute Details:</h3>
					{numNonExemptGroupAttributes(evalGroup) > 0 ? (
						<div className='flex flex-col gap-2 max-h-[350px] sm:max-h-[300px] overflow-y-auto pr-1'>
							{mapNonExemptGroupAttributes(evalGroup, (evalAttr, index) => {
								// Create proper attribute anchor for links
								const detailUrl = `/${wallet.metadata.id}#${toKebabCase(evalAttr.attribute.id)}`

								return (
									<div key={evalAttr.attribute.id} className='mb-2'>
										<a
											href={detailUrl}
											className={cx(
												'flex items-center p-2 rounded cursor-pointer text-sm',
												hoveredSliceIndex === index
													? 'bg-gray-200 dark:bg-gray-700'
													: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
											)}
											onMouseEnter={() => {
												setHoveredSliceIndex(index)
											}}
											onMouseLeave={() => {
												setHoveredSliceIndex(null)
											}}
											onClick={() => {
												// toggleExpandedAttribute(evalAttr.attribute.id)
											}}
										>
											<div
												className='w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300 dark:border-gray-600'
												style={{
													backgroundColor: ratingToColor(evalAttr.evaluation.value.rating),
												}}
											/>
											<span className='flex-1 text-sm'>{evalAttr.attribute.displayName}</span>
											<RatingStatusBadge rating={evalAttr.evaluation.value.rating} />
										</a>
									</div>
								)
							})}
						</div>
					) : (
						<p className='text-gray-500 dark:text-gray-400 text-sm'>
							No attribute ratings available for this category.
						</p>
					)}
				</div>
			</div>
		</>
	)
}
