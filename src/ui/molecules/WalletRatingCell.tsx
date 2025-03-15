import type { EvaluationTree } from '@/schema/attribute-groups'
import {
	type AttributeGroup,
	type EvaluatedGroup,
	type ValueSet,
	type EvaluatedAttribute,
	Rating,
	type Value,
	evaluatedAttributesEntries,
	ratingToIcon,
	ratingToColor,
} from '@/schema/attributes'
import { attributeVariantSpecificity, VariantSpecificity } from '@/schema/wallet'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import { Box, Typography, Link } from '@mui/material'
import type React from 'react'
import { Arc, type PieSlice, RatingPie } from '../atoms/RatingPie'
import type { GridColTypeDef } from '@mui/x-data-grid'
import { expandedRowHeight, ratingCellWidth, shortRowHeight } from '../../components/constants'
import { useState } from 'react'
import type { WalletRowStateHandle } from '../WalletTableState'
import { IconLink } from '../atoms/IconLink'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import LinkIcon from '@mui/icons-material/Link'
import { variantToName, variantUrlQuery } from '../../components/variants'
import { RenderTypographicContent } from '../atoms/RenderTypographicContent'
import { slugifyCamelCase } from '@/types/utils/text'
import { betaSiteRoot } from '@/constants'
import { refs } from '@/schema/reference'
import { ReferenceLinks } from '../atoms/ReferenceLinks'
import { toFullyQualified } from '@/schema/reference'

/**
 * Common properties of rating-type columns.
 */
export const walletRatingColumnProps: GridColTypeDef = {
	resizable: true,
	filterable: false,
	editable: false,
	width: ratingCellWidth,
	minWidth: ratingCellWidth,
	// Remove maxWidth constraint to allow columns to grow
	// maxWidth: ratingCellWidth,
	flex: 0.5, // Add flex property to allow columns to grow with available space
	align: 'center',
	headerAlign: 'left',
}

const ratingPieMargin = 2
// Reduce the size of the chart to make it less dominant
const ratingPieHeight = 130
const ratingPieWidth = 130

// Function to get slightly increased row height
const getRowExtraHeight = () => 20; // Extra height added to base shortRowHeight

/** A single cell evaluating a wallet on an attribute group. */
export function WalletRatingCell<Vs extends ValueSet>({
	row,
	attrGroup,
	evalGroupFn,
}: {
	row: WalletRowStateHandle
	attrGroup: AttributeGroup<Vs>
	evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>
}): React.JSX.Element {
	const evalGroup = evalGroupFn(row.evalTree)
	const evalEntries = evaluatedAttributesEntries(evalGroup).filter(
		([_, evalAttr]) => evalAttr.evaluation.value.rating !== Rating.EXEMPT,
	)
	const groupScore = attrGroup.score(evalGroup)
	if (groupScore === null || !isNonEmptyArray(evalEntries)) {
		return <>N/A</>
	}
	const { score, hasUnratedComponent } = groupScore
	const centerLabel = hasUnratedComponent
		? ratingToIcon(Rating.UNRATED)
		: score <= 0.0
			? '\u{1f480}' /* Skull */
			: score >= 1.0
				? '\u{1f4af}' /* 100 */
				: Math.round(score * 100).toString()
	const [highlightedSlice, setHighlightedSlice] = useState<{
		evalAttrId: keyof EvaluatedGroup<Vs>
		sticky: boolean
	} | null>(null)
	const highlightedEvalAttr =
		highlightedSlice === null ? null : evalGroup[highlightedSlice.evalAttrId]
	const slices: NonEmptyArray<PieSlice> = nonEmptyMap(
		evalEntries,
		([evalAttrId, evalAttr]: [keyof EvaluatedGroup<Vs>, EvaluatedAttribute<Value>]): PieSlice => {
			const icon = evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon
			const tooltipSuffix: string = (() => {
				if (
					row.table.variantSelected === null ||
					row.wallet.variants[row.table.variantSelected] === undefined
				) {
					return ''
				}
				switch (
				attributeVariantSpecificity(row.wallet, row.table.variantSelected, evalAttr.attribute)
				) {
					case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
						return ''
					case VariantSpecificity.ALL_SAME:
						return ''
					case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
						return ''
					case VariantSpecificity.UNIQUE_TO_VARIANT:
						return ` (${variantToName(row.table.variantSelected, false)} only)`
					case VariantSpecificity.NOT_UNIVERSAL:
						return ` (${variantToName(row.table.variantSelected, false)} specific)`
				}
			})()
			return {
				id: evalAttrId.toString(),
				color: ratingToColor(evalAttr.evaluation.value.rating),
				weight: 1,
				arcLabel: icon,
				tooltip: `${icon} ${evalAttr.evaluation.value.displayName}${tooltipSuffix}`,
				tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
				focusChange: (focused: boolean) => {
					if (!focused) {
						return // Do nothing on de-focus.
					}
					if (highlightedSlice === null) {
						// First to be focused.
						setHighlightedSlice({
							evalAttrId,
							sticky: false,
						})
					} else {
						// Not the first to be focused. Maintain sticky bit.
						setHighlightedSlice({
							evalAttrId,
							sticky: highlightedSlice.sticky,
						})
					}
				},
				click: () => {
					if (highlightedSlice === null || highlightedSlice.evalAttrId !== evalAttrId) {
						// Clicking on a slice for the first time, or clicking a different
						// slice than the current highlighted slice. Highlight and set
						// sticky bit.
						setHighlightedSlice({
							evalAttrId,
							sticky: true,
						})
					} else {
						// Clicking on currently-highlighted slice. Flip sticky bit.
						setHighlightedSlice({
							evalAttrId,
							sticky: !highlightedSlice.sticky,
						})
					}
					// In either case, expand the row.
					row.setExpanded(true)
				},
			}
		},
	)
	
	// Get references if there's a highlighted attribute
	const attributeReferences = highlightedEvalAttr && highlightedEvalAttr.evaluation
		? (highlightedEvalAttr.evaluation.references) || 
		  (highlightedEvalAttr.evaluation.value ? refs(highlightedEvalAttr.evaluation.value) : [])
		: [];
	
	// Make sure references are fully qualified
	const qualifiedReferences = attributeReferences.length > 0 
		? toFullyQualified(attributeReferences as any) // Cast to any to bypass TypeScript error
		: [];
	
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			gap="4px"
			sx={row.rowWideStyle}
			onMouseLeave={() => {
				if (highlightedSlice !== null && !highlightedSlice.sticky) {
					setHighlightedSlice(null)
				}
			}}
		>
			<Box sx={{ width: ratingPieWidth, height: ratingPieHeight, position: 'relative' }}>
				<RatingPie
					pieId={attrGroup.id}
					slices={slices}
					highlightedSliceId={
						highlightedSlice === null ? null : highlightedSlice.evalAttrId.toString()
					}
					arc={Arc.FULL}
					width={ratingPieWidth}
					height={ratingPieHeight}
					centerLabel=""
					paddingAngle={8}
					cornerRadiusFraction={0.1}
					innerRadiusFraction={0.05}
					outerRadiusFraction={0.95}
					hoverRadiusFraction={1.03}
				/>
			</Box>
			{row.expanded ? (
				<Box
					height={expandedRowHeight - shortRowHeight + getRowExtraHeight()}
					display="flex"
					flexDirection="column"
					lineHeight="0.9"
					gap="3px"
					sx={{ 
						lineHeight: 1.1, 
						whiteSpace: "normal",
						color: 'var(--text-primary)',
						maxWidth: "100%",
						overflow: "auto",
						p: 0.5,
						wordWrap: "break-word",
						overflowWrap: "break-word"
					}}
				>
					{highlightedEvalAttr === null ? (
						<>
							<Typography variant="h3" sx={{ color: 'var(--text-primary)', mb: 1, wordWrap: "break-word", overflowWrap: "break-word" }}>
								{attrGroup.icon} {attrGroup.displayName}
							</Typography>
							<RenderTypographicContent
								content={attrGroup.perWalletQuestion.render(row.wallet.metadata)}
								typography={{
									variant: 'body2',
									color: 'var(--text-primary)',
									lineHeight: 1.2,
									marginBottom: 1
								}}
							/>
						</>
					) : (
						<>
							<Typography variant="h4" sx={{ color: 'var(--text-primary)', wordWrap: "break-word", overflowWrap: "break-word" }}>
								{highlightedEvalAttr.evaluation.value.icon ?? highlightedEvalAttr.attribute.icon}{' '}
								{highlightedEvalAttr.attribute.displayName}{' '}
							</Typography>
							<RenderTypographicContent
								content={highlightedEvalAttr.evaluation.value.shortExplanation.render(
									row.wallet.metadata,
								)}
								typography={{
									variant: 'body2',
									color: 'var(--text-primary)',
									lineHeight: 1,
									marginBottom: 1
								}}
								textTransform={(input: string) => {
									const suffix: string = (() => {
										if (
											row.table.variantSelected === null ||
											row.wallet.variants[row.table.variantSelected] === undefined
										) {
											return ''
										}
										switch (
										attributeVariantSpecificity(
											row.wallet,
											row.table.variantSelected,
											highlightedEvalAttr.attribute,
										)
										) {
											case VariantSpecificity.ALL_SAME:
												return ''
											case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
												return ''
											case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
												return ''
											case VariantSpecificity.NOT_UNIVERSAL:
												return ` This is the case on the ${variantToName(row.table.variantSelected, false)} version.`
											case VariantSpecificity.UNIQUE_TO_VARIANT:
												return ` This is only the case on the ${variantToName(row.table.variantSelected, false)} version.`
										}
									})()
									return `${ratingToIcon(highlightedEvalAttr.evaluation.value.rating)} ${input.trim()}${suffix}`
								}}
							/>
							
							{/* Display references if available */}
							{qualifiedReferences.length > 0 && (
								<Box 
									sx={{ 
										mt: 0.5,
										px: 1.5,
										py: 0.75,
										width: '100%',
										backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
										borderRadius: 1,
										border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
									}}
								>
									{/* Header for references */}
									<Typography variant="caption" sx={{ 
										display: 'flex', 
										alignItems: 'center',
										gap: 0.5,
										mb: 0.5,
										color: 'var(--text-primary)',
										fontWeight: 'medium'
									}}>
										<InfoOutlinedIcon sx={{ fontSize: '0.875rem' }} />
										Source
									</Typography>
									
									{qualifiedReferences.map((ref, refIndex) => (
										<Box key={refIndex} sx={{ mb: refIndex < qualifiedReferences.length - 1 ? 1 : 0 }}>
											{/* Reference links */}
											<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
												{ref.urls && ref.urls.map((url, urlIndex) => (
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
															color: 'var(--text-primary)',
															textDecoration: 'none',
															wordWrap: 'break-word',
															overflowWrap: 'break-word',
															maxWidth: '100%',
															'&:hover': { textDecoration: 'underline' }
														}}
													>
														<LinkIcon fontSize="inherit" />
														{url.label}
													</Link>
												))}
											</Box>
											
											{/* Reference explanation */}
											{ref.explanation && (
												<Typography 
													variant="caption" 
													sx={{ 
														color: 'var(--text-primary)',
														display: 'block',
														fontSize: '0.75rem',
														lineHeight: 1.3,
														mb: 0.25,
														fontStyle: 'italic',
														wordWrap: 'break-word',
														overflowWrap: 'break-word'
													}}
												>
													{ref.explanation}
												</Typography>
											)}
										</Box>
									))}
								</Box>
							)}
							
							<Box display="flex" flexDirection="row" justifyContent="center">
								<IconLink
									href={`${betaSiteRoot}/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}#${slugifyCamelCase(highlightedEvalAttr.attribute.id)}`}
									IconComponent={InfoOutlinedIcon}
									color="text.primary"
								>
									Learn more
								</IconLink>
							</Box>
						</>
					)}
				</Box>
			) : null}
		</Box>
	)
}
