'use client';

import type { EvaluationTree } from '@/beta/schema/attribute-groups';
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
} from '@/beta/schema/attributes';
import { attributeVariantSpecificity, VariantSpecificity } from '@/beta/schema/wallet';
import { isNonEmptyArray, type NonEmptyArray, nonEmptyMap } from '@/beta/types/utils/non-empty';
import { Box, Typography } from '@mui/material';
import type React from 'react';
import { Arc, type PieSlice, RatingPie } from '../atoms/RatingPie';
import type { GridColTypeDef } from '@mui/x-data-grid';
import { expandedRowHeight, ratingCellWidth, shortRowHeight } from '../../constants';
import { useState } from 'react';
import type { WalletRowStateHandle } from '../WalletTableState';
import { IconLink } from '../atoms/IconLink';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { variantToName, variantUrlQuery } from '../../variants';
import { RenderTypographicContent } from '../atoms/RenderTypographicContent';
import { slugifyCamelCase } from '@/beta/types/utils/text';
import { betaSiteRoot } from '@/beta/constants';

/**
 * Common properties of rating-type columns.
 */
export const walletRatingColumnProps: GridColTypeDef = {
  resizable: false,
  filterable: false,
  editable: false,
  width: ratingCellWidth,
  minWidth: ratingCellWidth,
  maxWidth: ratingCellWidth,
  align: 'center',
  headerAlign: 'left',
};

const ratingPieMargin = 2;
const ratingPieHeight = shortRowHeight - ratingPieMargin * 2;
const ratingPieWidth = ratingPieHeight * 2;

/** A single cell evaluating a wallet on an attribute group. */
export function WalletRatingCell<Vs extends ValueSet>({
  row,
  attrGroup,
  evalGroupFn,
}: {
  row: WalletRowStateHandle;
  attrGroup: AttributeGroup<Vs>;
  evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>;
}): React.JSX.Element {
  const evalGroup = evalGroupFn(row.evalTree);
  const evalEntries = evaluatedAttributesEntries(evalGroup).filter(
    ([_, evalAttr]) => evalAttr.evaluation.value.rating !== Rating.EXEMPT
  );
  const groupScore = attrGroup.score(evalGroup);
  if (groupScore === null || !isNonEmptyArray(evalEntries)) {
    return <>N/A</>;
  }
  const { score, hasUnratedComponent } = groupScore;
  const centerLabel = hasUnratedComponent
    ? ratingToIcon(Rating.UNRATED)
    : score <= 0.0
      ? '\u{1f480}' /* Skull */
      : score >= 1.0
        ? '\u{1f4af}' /* 100 */
        : Math.round(score * 100).toString();
  const [highlightedSlice, setHighlightedSlice] = useState<{
    evalAttrId: keyof EvaluatedGroup<Vs>;
    sticky: boolean;
  } | null>(null);
  const highlightedEvalAttr =
    highlightedSlice === null ? null : evalGroup[highlightedSlice.evalAttrId];
  const slices: NonEmptyArray<PieSlice> = nonEmptyMap(
    evalEntries,
    ([evalAttrId, evalAttr]: [keyof EvaluatedGroup<Vs>, EvaluatedAttribute<Value>]): PieSlice => {
      const icon = evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon;
      const tooltipSuffix: string = (() => {
        if (
          row.table.variantSelected === null ||
          row.wallet.variants[row.table.variantSelected] === undefined
        ) {
          return '';
        }
        switch (
          attributeVariantSpecificity(row.wallet, row.table.variantSelected, evalAttr.attribute)
        ) {
          case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
            return '';
          case VariantSpecificity.ALL_SAME:
            return '';
          case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
            return '';
          case VariantSpecificity.UNIQUE_TO_VARIANT:
            return ` (${variantToName(row.table.variantSelected, false)} only)`;
          case VariantSpecificity.NOT_UNIVERSAL:
            return ` (${variantToName(row.table.variantSelected, false)} specific)`;
        }
      })();
      return {
        id: evalAttrId.toString(),
        color: ratingToColor(evalAttr.evaluation.value.rating),
        weight: 1,
        arcLabel: icon,
        tooltip: `${icon} ${evalAttr.evaluation.value.displayName}${tooltipSuffix}`,
        tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
        focusChange: (focused: boolean) => {
          if (!focused) {
            return; // Do nothing on de-focus.
          }
          if (highlightedSlice === null) {
            // First to be focused.
            setHighlightedSlice({
              evalAttrId,
              sticky: false,
            });
          } else {
            // Not the first to be focused. Maintain sticky bit.
            setHighlightedSlice({
              evalAttrId,
              sticky: highlightedSlice.sticky,
            });
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
            });
          } else {
            // Clicking on currently-highlighted slice. Flip sticky bit.
            setHighlightedSlice({
              evalAttrId,
              sticky: !highlightedSlice.sticky,
            });
          }
          // In either case, expand the row.
          row.setExpanded(true);
        },
      };
    }
  );
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap="4px"
      sx={row.rowWideStyle}
      onMouseLeave={() => {
        if (highlightedSlice !== null && !highlightedSlice.sticky) {
          setHighlightedSlice(null);
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
          sx={{ lineHeight: 1, whiteSpace: 'normal' }}
        >
          {highlightedEvalAttr === null ? (
            <>
              <Typography variant="h3" whiteSpace="nowrap">
                {attrGroup.icon} {attrGroup.displayName}
              </Typography>
              <RenderTypographicContent
                content={attrGroup.perWalletQuestion.render(row.wallet.metadata)}
                typography={{
                  variant: 'body2',
                }}
              />
            </>
          ) : (
            <>
              <Typography variant="h4" whiteSpace="nowrap">
                {highlightedEvalAttr.evaluation.value.icon ?? highlightedEvalAttr.attribute.icon}{' '}
                {highlightedEvalAttr.attribute.displayName}{' '}
              </Typography>
              <RenderTypographicContent
                content={highlightedEvalAttr.evaluation.value.shortExplanation.render(
                  row.wallet.metadata
                )}
                typography={{
                  variant: 'body2',
                }}
                textTransform={(input: string) => {
                  const suffix: string = (() => {
                    if (
                      row.table.variantSelected === null ||
                      row.wallet.variants[row.table.variantSelected] === undefined
                    ) {
                      return '';
                    }
                    switch (
                      attributeVariantSpecificity(
                        row.wallet,
                        row.table.variantSelected,
                        highlightedEvalAttr.attribute
                      )
                    ) {
                      case VariantSpecificity.ALL_SAME:
                        return '';
                      case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
                        return '';
                      case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
                        return '';
                      case VariantSpecificity.NOT_UNIVERSAL:
                        return ` This is the case on the ${variantToName(row.table.variantSelected, false)} version.`;
                      case VariantSpecificity.UNIQUE_TO_VARIANT:
                        return ` This is only the case on the ${variantToName(row.table.variantSelected, false)} version.`;
                    }
                  })();
                  return `${ratingToIcon(highlightedEvalAttr.evaluation.value.rating)} ${input.trim()}${suffix}`;
                }}
              />
              <Box display="flex" flexDirection="row" justifyContent="center">
                <IconLink
                  href={`${betaSiteRoot}/wallet/${row.wallet.metadata.id}/${variantUrlQuery(row.wallet.variants, row.table.variantSelected)}#${slugifyCamelCase(highlightedEvalAttr.attribute.id)}`}
                  IconComponent={InfoOutlinedIcon}
                >
                  Learn more
                </IconLink>
              </Box>
            </>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
