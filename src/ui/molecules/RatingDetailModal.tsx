import type React from 'react'
import { useState, useEffect } from 'react'
import { Modal, Button, useMediaQuery, useTheme, Typography } from '@mui/material'
import {
	ratingToColor,
	ratingToText,
	type AttributeGroup,
	type EvaluatedGroup,
	type ValueSet,
} from '@/schema/attributes'
import { mapNonExemptGroupAttributes, numNonExemptGroupAttributes } from '@/schema/attribute-groups'
import { toFullyQualified, type FullyQualifiedReference } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import type { HardwareWalletModel } from '@/schema/features/profile'
import { RenderContent } from '../atoms/RenderContent'
import type { LabeledUrl } from '@/schema/url'

interface RatingDetailModalProps<Vs extends ValueSet> {
	open: boolean
	onClose: () => void
	wallet: RatedWallet
	attrGroup: AttributeGroup<Vs>
	evalGroup: EvaluatedGroup<Vs>
	hardwareWalletModel?: HardwareWalletModel
}

// Convert attribute ID to kebab-case for URLs
function toKebabCase(str: string): string {
	// Handle camelCase
	const fromCamel = str.replace(/([a-z])([A-Z])/g, '$1-$2')
	// Handle snake_case
	const fromSnake = fromCamel.replace(/_/g, '-')
	// Convert to lowercase
	return fromSnake.toLowerCase()
}

export function RatingDetailModal<Vs extends ValueSet>({
	open,
	onClose,
	attrGroup,
	evalGroup,
	wallet,
	hardwareWalletModel,
}: RatingDetailModalProps<Vs>): React.ReactElement {
	const theme = useTheme()
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
	const [expandedAttribute, setExpandedAttribute] = useState<string | null>(null)
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

	const attrGroupScore = attrGroup.score(evalGroup)
	const overallScore = attrGroupScore === null ? 0 : attrGroupScore.score

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
					stroke="#ffffff"
					strokeWidth="2"
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

	// Toggle expanded state for an attribute
	const toggleExpandedAttribute = (attributeId: string): void => {
		setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId)
	}

	// Add the model selector component
	const modelSelector = hasHardwareModels ? (
		<div className="mb-4">
			<Typography variant="subtitle2" className="mb-2">
				Select Device Model:
			</Typography>
			<div className="flex flex-wrap gap-2">
				{hardwareModels.map(model => (
					<Button
						key={model.id}
						variant={
							selectedModel !== null && selectedModel.id === model.id ? 'contained' : 'outlined'
						}
						size="small"
						onClick={() => {
							setSelectedModel(model)
						}}
						sx={{
							borderRadius: '16px',
							textTransform: 'none',
							fontSize: '0.75rem',
							backgroundColor:
								selectedModel !== null && selectedModel.id === model.id
									? 'primary.main'
									: 'transparent',
							'&:hover': {
								backgroundColor:
									selectedModel !== null && selectedModel.id === model.id
										? 'primary.dark'
										: 'rgba(0, 0, 0, 0.04)',
							},
						}}
					>
						{model.name}
						{model.isFlagship && (
							<span style={{ marginLeft: '4px', fontSize: '0.65rem' }}>(Flagship)</span>
						)}
					</Button>
				))}
			</div>
		</div>
	) : null

	return (
		<Modal
			open={open}
			onClose={onClose}
			className="flex items-center justify-center overflow-y-auto"
		>
			<div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-[90vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="flex justify-between items-center mb-4">
					<Typography variant="h6" className="dark:text-gray-100 font-bold">
						{attrGroup.displayName} Details
					</Typography>
					<Button
						variant="outlined"
						size="small"
						onClick={onClose}
						className="dark:text-gray-200 dark:border-gray-500"
					>
						Close
					</Button>
				</div>

				{/* Add the model selector if we have hardware wallet models */}
				{modelSelector}

				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-medium" id="rating-detail-modal-title">
						{attrGroup.displayName} - {Math.round(overallScore * 100)}% Overall
						{selectedModel !== null && hasHardwareModels && (
							<span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
								{selectedModel.name}
								{selectedModel.isFlagship && (
									<span className="ml-1 text-purple-500 dark:text-purple-400">(Flagship)</span>
								)}
							</span>
						)}
					</h2>
				</div>

				<div
					className={`flex ${isSmallScreen ? 'flex-col items-center' : 'flex-row items-start'} gap-4`}
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
						{numNonExemptGroupAttributes(evalGroup) > 0 ? (
							<div className="flex flex-col gap-2 max-h-[350px] sm:max-h-[300px] overflow-y-auto pr-1">
								{mapNonExemptGroupAttributes(evalGroup, (evalAttr, index) => {
									const isExpanded = expandedAttribute === evalAttr.attribute.id
									const references = toFullyQualified(evalAttr.evaluation.references)
									const hasReferences = references.length > 0

									// Create proper attribute anchor for links
									const detailUrl = `/${wallet.metadata.id}#${toKebabCase(evalAttr.attribute.id)}`

									return (
										<div key={evalAttr.attribute.id} className="mb-2">
											<div
												className={`flex items-center p-2 rounded cursor-pointer text-sm ${
													hoveredSliceIndex === index
														? 'bg-gray-200 dark:bg-gray-700'
														: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
												}`}
												onMouseEnter={() => {
													setHoveredSliceIndex(index)
												}}
												onMouseLeave={() => {
													setHoveredSliceIndex(null)
												}}
												onClick={() => {
													toggleExpandedAttribute(evalAttr.attribute.id)
												}}
											>
												<div
													className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300 dark:border-gray-600"
													style={{
														backgroundColor: ratingToColor(evalAttr.evaluation.value.rating),
													}}
												/>
												<span className="flex-1 text-sm">{evalAttr.attribute.displayName}</span>
												<div
													className="px-2 py-1 rounded min-w-[50px] text-center text-xs font-bold"
													style={{
														backgroundColor: ratingToColor(evalAttr.evaluation.value.rating),
														color: theme.palette.primary.main,
													}}
												>
													{ratingToText(evalAttr.evaluation.value.rating)}
												</div>
											</div>

											{/* References and Learn More button */}
											{isExpanded && (
												<div className="pl-8 mt-2 text-sm">
													{/* Show the short explanation */}
													<div className="mb-3 font-medium text-gray-800 dark:text-gray-200">
														<RenderContent
															content={evalAttr.evaluation.value.shortExplanation.render(
																wallet.metadata,
															)}
														/>
													</div>

													{hasReferences ? (
														<div className="space-y-3">
															{references.map((ref: FullyQualifiedReference, refIndex: number) => (
																<div
																	key={refIndex}
																	className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 py-1"
																>
																	{ref.explanation !== undefined && ref.explanation !== '' && (
																		<p className="mb-2 text-gray-700 dark:text-gray-300">
																			{ref.explanation}
																		</p>
																	)}
																	<div className="flex flex-wrap gap-2 mt-1">
																		{ref.urls.map((urlObj: LabeledUrl, urlIndex: number) => (
																			<a
																				key={urlIndex}
																				href={urlObj.url}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="text-blue-500 hover:underline inline-flex items-center"
																			>
																				<span>
																					{urlObj.label === '' ? 'Reference' : urlObj.label}
																				</span>
																				{/* SVG icon */}
																			</a>
																		))}
																	</div>
																</div>
															))}
														</div>
													) : (
														<p className="text-gray-500 dark:text-gray-400 italic">
															No references available for this attribute.
														</p>
													)}

													{/* Learn More Button */}
													<div className="mt-3">
														<a
															href={detailUrl}
															className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 inline-flex items-center"
														>
															Learn More
															<svg
																className="w-3 h-3 ml-1"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
																xmlns="http://www.w3.org/2000/svg"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	d="M14 5l7 7m0 0l-7 7m7-7H3"
																></path>
															</svg>
														</a>
													</div>
												</div>
											)}
										</div>
									)
								})}
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
