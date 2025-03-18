import {
  Rating,
  type AttributeGroup,
  type EvaluatedAttribute,
  type EvaluatedGroup,
  type Value,
  type ValueSet,
} from '@/beta/schema/attributes';
import { getAttributeOverride, VariantSpecificity, type RatedWallet } from '@/beta/schema/wallet';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { WrapIcon } from '../atoms/WrapIcon';
import { subsectionBorderRadius, subsectionIconWidth, subsectionWeight } from '../../constants';
import { type AccordionData, Accordions } from '../atoms/Accordions';
import type { NonEmptyArray } from '@/beta/types/utils/non-empty';
import { WrapRatingIcon } from '../atoms/WrapRatingIcon';
import { AttributeMethodology } from '../molecules/attributes/AttributeMethodology';
import { subsectionTheme } from '../../ThemeRegistry/theme';
import type { Variant } from '@/beta/schema/variants';
import { variantToName } from '../../variants';
import { RenderContent } from '../atoms/RenderContent';
import { RenderTypographicContent } from '../atoms/RenderTypographicContent';
import { isTypographicContent } from '@/beta/types/content';

export function WalletAttribute<Vs extends ValueSet, V extends Value>({
  wallet,
  attrGroup,
  evalGroup,
  evalAttr,
  variantSpecificity,
  displayedVariant,
}: {
  wallet: RatedWallet;
  attrGroup: AttributeGroup<Vs>;
  evalGroup: EvaluatedGroup<Vs>;
  evalAttr: EvaluatedAttribute<V>;
} & (
  | {
      variantSpecificity:
        | VariantSpecificity.ALL_SAME
        | VariantSpecificity.NOT_UNIVERSAL
        | VariantSpecificity.UNIQUE_TO_VARIANT;
      displayedVariant: Variant | null;
    }
  | {
      variantSpecificity: VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT;
      displayedVariant: Variant;
    }
)): React.JSX.Element {
  const details = evalAttr.evaluation.details.render({
    wallet,
    value: evalAttr.evaluation.value,
  });
  const override = getAttributeOverride(wallet, attrGroup.id, evalAttr.attribute.id);
  const variantSpecificCaption: React.ReactNode = (() => {
    switch (variantSpecificity) {
      case VariantSpecificity.ALL_SAME:
        return null;
      case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
        return (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            This rating is only relevant for the {variantToName(displayedVariant, false)} version.
          </Typography>
        );
      default:
        return (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {displayedVariant === null
              ? 'This rating differs across versions. Select a specific version for details.'
              : `This rating is specific to the ${variantToName(displayedVariant, false)} version.`}
          </Typography>
        );
    }
  })();
  let rendered = (
    <>
      <React.Fragment key="details">
        <RenderContent
          content={details}
          typography={{
            fontWeight: subsectionWeight,
          }}
        />
      </React.Fragment>
      <React.Fragment key="variantSpecific">{variantSpecificCaption}</React.Fragment>
      <React.Fragment key="impact">
        {evalAttr.evaluation.impact === undefined ? null : (
          <>
            <Box height="1rem"></Box>
            <RenderTypographicContent
              content={evalAttr.evaluation.impact.render({
                wallet,
                value: evalAttr.evaluation.value,
              })}
              typography={{
                fontWeight: subsectionWeight,
              }}
            />
          </>
        )}
      </React.Fragment>
    </>
  );
  if (isTypographicContent(details)) {
    rendered = (
      <WrapRatingIcon rating={evalAttr.evaluation.value.rating}>{rendered}</WrapRatingIcon>
    );
  }
  const accordions: NonEmptyArray<AccordionData> = [
    {
      id: `why-${evalAttr.attribute.id}`,
      summary:
        evalAttr.evaluation.value.rating === Rating.PASS ||
        evalAttr.evaluation.value.rating === Rating.UNRATED
          ? 'Why does this matter?'
          : 'Why should I care?',
      contents: (
        <RenderContent
          content={evalAttr.attribute.why.render({})}
          typography={{ variant: 'body2' }}
        />
      ),
    },
    {
      id: `methodology-${evalAttr.attribute.id}`,
      summary: `How is ${evalAttr.attribute.midSentenceName} evaluated?`,
      contents: (
        <AttributeMethodology attribute={evalAttr.attribute} evaluation={evalAttr.evaluation} />
      ),
    },
  ];
  const howToImprove =
    override?.howToImprove !== undefined ? override.howToImprove : evalAttr.evaluation.howToImprove;
  if (howToImprove !== undefined) {
    accordions.push({
      id: `how-${evalAttr.attribute.id}`,
      summary: `What can ${wallet.metadata.displayName} do about its ${evalAttr.attribute.midSentenceName}?`,
      contents: (
        <RenderTypographicContent
          content={howToImprove.render({ wallet, value: evalAttr.evaluation.value })}
          typography={{ variant: 'body2' }}
        />
      ),
    });
  }
  return (
    <>
      {rendered}
      {override?.note !== undefined ? (
        <WrapIcon
          icon={'\u{1f449}'}
          iconFontSize={subsectionTheme.typography.body1.fontSize}
          iconWidth={subsectionIconWidth}
          sx={{ marginTop: '1rem' }}
        >
          <RenderContent content={override.note.render({ wallet })} />
        </WrapIcon>
      ) : null}
      <Accordions
        accordions={accordions}
        borderRadius={`${subsectionBorderRadius}px`}
        summaryTypographyVariant="h4"
        interAccordionMargin="1rem"
      />
    </>
  );
}
