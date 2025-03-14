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
const ratingPieHeight = shortRowHeight - ratingPieMargin * 2
const ratingPieWidth = ratingPieHeight * 2

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
	const qualifiedReferences = attributeReferences.length > 0 ? toFullyQualified(attributeReferences) : [];
	
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
			<RatingPie
				pieId={attrGroup.id}
				slices={slices}
				highlightedSliceId={
					highlightedSlice === null ? null : highlightedSlice.evalAttrId.toString()
				}
				arc={Arc.TOP_HALF}
				width={ratingPieWidth}
				height={ratingPieHeight}
				centerLabel={centerLabel}
			/>
			{row.expanded ? (
				<Box
					height={expandedRowHeight - shortRowHeight}
					display="flex"
					flexDirection="column"
					lineHeight="1"
					gap="4px"
					sx={{ 
						lineHeight: 1, 
						whiteSpace: 'normal',
						color: 'var(--text-primary)',
					}}
				>
					{highlightedEvalAttr === null ? (
						<>
							<Typography variant="h3" whiteSpace="nowrap" sx={{ color: 'var(--text-primary)' }}>
								{attrGroup.icon} {attrGroup.displayName}
							</Typography>
							<RenderTypographicContent
								content={attrGroup.perWalletQuestion.render(row.wallet.metadata)}
								typography={{
									variant: 'body2',
									color: 'var(--text-primary)',
								}}
							/>
						</>
					) : (
						<>
							<Typography variant="h4" whiteSpace="nowrap" sx={{ color: 'var(--text-primary)' }}>
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
										mt: 1,
										px: 1,
										width: '100%'
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
														fontSize: '0.7rem',
														lineHeight: 1.2,
														mb: 0.5,
														fontStyle: 'italic'
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
