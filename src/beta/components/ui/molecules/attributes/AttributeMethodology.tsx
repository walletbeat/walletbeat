import {
  type Attribute,
  type Evaluation,
  type ExampleRating,
  Rating,
  ratingToIcon,
  type Value,
} from '@/beta/schema/attributes';
import { Divider, Typography } from '@mui/material';
import { Box } from '@mui/system';
import type { NonEmptyArray } from '@/beta/types/utils/non-empty';
import React from 'react';
import { mdSentence, type Sentence } from '@/beta/types/content';
import { styled } from '@mui/material/styles';
import { RenderTypographicContent } from '../../atoms/RenderTypographicContent';

const typographyPropsHeader: React.ComponentProps<typeof RenderTypographicContent>['typography'] = {
  variant: 'h6',
};

const typographyPropsBody: React.ComponentProps<typeof RenderTypographicContent>['typography'] = {
  variant: 'body2',
};

interface ListItemProps {
  isFirstItem: boolean;
  bulletText: string;
  bulletFontSize?: string;
  spaceBetweenItems?: string;
}

const StyledListItem = styled('li')<ListItemProps>`
  margin-top: ${props => (props.isFirstItem ? '0px' : (props.spaceBetweenItems ?? '0px'))};
  &::marker {
    content: '${props => props.bulletText}  ';
    font-size: ${props => props.bulletFontSize ?? 'inherit'};
  }
`;

function replaceExampleRatingPrefix(
  theWallet: string,
  theWalletPossessive: string
): (text: string) => string {
  return (text: string): string => {
    const whitespacePrefixLength = text.length - text.trimStart().length;
    const whitespacePrefix =
      whitespacePrefixLength === 0 ? '' : text.substring(0, whitespacePrefixLength);
    const unprefixedText =
      whitespacePrefixLength === 0 ? text : text.substring(whitespacePrefix.length);
    if (unprefixedText.startsWith('The wallet ')) {
      return `${whitespacePrefix}${theWallet}${unprefixedText.substring('The wallet '.length)}`;
    }
    if (unprefixedText.startsWith("The wallet's ")) {
      return `${whitespacePrefix}${theWalletPossessive}${unprefixedText.substring("The wallet's ".length)}`;
    }
    throw new Error(
      `Example ratings should always begin with the phrase "The wallet"; got: "${unprefixedText}"`
    );
  };
}

function ExampleRatings<V extends Value>({
  displayOrder,
  passExamples,
  partialExamples,
  failExamples,
  exhaustive,
}: {
  displayOrder: 'pass-fail' | 'fail-pass';
  passExamples: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>;
  partialExamples: ExampleRating<V> | Array<ExampleRating<V>> | undefined;
  failExamples: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>;
  exhaustive: boolean;
}): React.JSX.Element {
  const renderListItem = (
    exampleRating: ExampleRating<V>,
    index: number,
    rating: Rating
  ): React.JSX.Element => (
    // Safe to use index as key here because example ratings are static and
    // never change order within the same rating.
    <StyledListItem
      key={`example-${index}`}
      bulletText={ratingToIcon(rating)}
      bulletFontSize="75%"
      isFirstItem={index === 0}
      spaceBetweenItems="0.125rem"
    >
      <RenderTypographicContent
        content={exampleRating.description.render({})}
        typography={typographyPropsBody}
        textTransform={replaceExampleRatingPrefix('It ', 'Its ')}
      />
    </StyledListItem>
  );
  const renderExamples = (
    rating: Rating,
    singularPreamble: Sentence,
    pluralPreamble: Sentence,
    exampleRatings: ExampleRating<V> | Array<ExampleRating<V>> | undefined
  ): { key: string; element: React.JSX.Element | null } => {
    const ratingsList: Array<ExampleRating<V>> =
      exampleRatings === undefined
        ? []
        : Array.isArray(exampleRatings)
          ? exampleRatings
          : [exampleRatings];
    if (ratingsList.length === 0) {
      return { key: rating, element: null };
    }
    const preamble = ratingsList.length === 1 ? singularPreamble : pluralPreamble;
    return {
      key: rating,
      element: (
        <React.Fragment>
          <RenderTypographicContent
            content={preamble.render({})}
            typography={typographyPropsHeader}
          />
          <ul>
            {ratingsList.map((exampleRating, index) =>
              renderListItem(exampleRating, index, rating)
            )}
          </ul>
        </React.Fragment>
      ),
    };
  };
  const passRendered = renderExamples(
    Rating.PASS,
    mdSentence('A wallet would get a **passing** rating if...'),
    mdSentence('A wallet would get a **passing** rating in any of these cases:'),
    passExamples
  );
  const partialRendered = renderExamples(
    Rating.PARTIAL,
    mdSentence('A wallet would get a **partial** rating if...'),
    mdSentence('A wallet would get a **partial** rating in any of these cases:'),
    partialExamples
  );
  const failRendered = renderExamples(
    Rating.FAIL,
    mdSentence('A wallet would get a **failing** rating if...'),
    mdSentence('A wallet would get a **failing** rating in any of these cases:'),
    failExamples
  );
  const renderedExamples: Array<{ key: string; element: React.JSX.Element | null }> = (() => {
    switch (displayOrder) {
      case 'pass-fail':
        return [passRendered, partialRendered, failRendered];
      case 'fail-pass':
        return [failRendered, partialRendered, passRendered];
    }
  })();
  return (
    <>
      <Typography variant="h5">{exhaustive ? 'In other words' : 'A few examples'}</Typography>
      <Box>
        {renderedExamples.map(renderedExample =>
          renderedExample.element === null ? null : (
            <Box key={renderedExample.key}>{renderedExample.element}</Box>
          )
        )}
      </Box>
    </>
  );
}

/**
 * Explain how an attribute is evaluated.
 * This is a wallet-agnostic, attribute-specific description.
 * However, it can optionally take in an `Evaluation`, which is used to match
 * a wallet's evaluation against one of the example evaluations of the
 * attribute and highlight this example.
 */
export function AttributeMethodology<V extends Value>({
  attribute,
  evaluation = undefined,
}: {
  attribute: Attribute<V>;
  evaluation?: Evaluation<V>;
}): React.JSX.Element {
  return (
    <>
      <Box key="methodology">
        <RenderTypographicContent
          content={attribute.methodology.render({})}
          typography={typographyPropsBody}
        />
      </Box>
      <Divider
        key="after-methodology"
        sx={{
          marginTop: '1rem',
          marginBottom: '1rem',
        }}
      />
      <Box key="example-ratings">
        {attribute.ratingScale.display === 'simple' ? (
          <RenderTypographicContent
            content={attribute.ratingScale.content.render({})}
            typography={typographyPropsBody}
          />
        ) : (
          <ExampleRatings
            displayOrder={attribute.ratingScale.display}
            passExamples={attribute.ratingScale.pass}
            partialExamples={attribute.ratingScale.partial}
            failExamples={attribute.ratingScale.fail}
            exhaustive={attribute.ratingScale.exhaustive}
          />
        )}
      </Box>
    </>
  );
}
