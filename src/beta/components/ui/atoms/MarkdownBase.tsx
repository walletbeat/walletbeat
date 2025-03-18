'use client';

import { Box, styled, Typography, type TypographyProps } from '@mui/material';
import Link from 'next/link';
import type React from 'react';
import Markdown, { type Components } from 'react-markdown';
import { ExternalLink } from './ExternalLink';
import { lookupEip } from '@/beta/data/eips';
import { EipLink } from './EipLink';
import { trimWhitespacePrefix } from '@/beta/types/utils/text';

export interface MarkdownOwnProps {
  markdownTransform?: (markdown: string) => string;
  pVariant?: React.ComponentProps<typeof Typography>['variant'];
  pFontWeight?: React.ComponentProps<typeof Typography>['fontWeight'];
  textColor?: React.ComponentProps<typeof Typography>['color'];
  pSpacing?: React.ComponentProps<typeof Typography>['marginTop'] & string;
  liSpacing?: React.ComponentProps<typeof Typography>['marginTop'] & string;
}

export function deriveMarkdownPropsFromTypography(
  typographyProps?: TypographyProps,
  markdownProps?: MarkdownOwnProps
): MarkdownOwnProps {
  let marginTop: string | undefined = undefined;
  if (typographyProps?.marginTop !== undefined) {
    if (typeof typographyProps.marginTop === 'number') {
      marginTop = `${typographyProps.marginTop}px`;
    } else if (typeof typographyProps.marginTop === 'string') {
      marginTop = typographyProps.marginTop;
    }
  }
  return {
    markdownTransform: markdownProps?.markdownTransform,
    textColor: markdownProps?.textColor ?? typographyProps?.color,
    pFontWeight: markdownProps?.pFontWeight ?? typographyProps?.fontWeight,
    pVariant: markdownProps?.pVariant ?? typographyProps?.variant,
    pSpacing: markdownProps?.pSpacing ?? marginTop,
    liSpacing: markdownProps?.liSpacing ?? marginTop,
  };
}

const StyledMarkdown = styled(Box, {
  shouldForwardProp: prop => prop !== 'pSpacing' && prop !== 'liSpacing',
})(
  ({ pSpacing, liSpacing }: MarkdownOwnProps) => `
  p, li {
    margin-top: 0px;
  }

  ${
    pSpacing === undefined
      ? ''
      : `p + p {
    margin-top: ${pSpacing};
  }`
  }

  ${
    liSpacing === undefined
      ? ''
      : `li + li {
    margin-top: ${pSpacing};
  }`
  }
`
);

/**
 * Markdown rendering.
 *
 * Should not be used directly; use MarkdownBox or MarkdownTypography.
 */
export function MarkdownBase({
  markdown,
  markdownTransform = undefined,
  pVariant = undefined,
  pFontWeight = undefined,
  pSpacing = '1rem',
  liSpacing = '0.5rem',
  textColor = 'inherit',
}: {
  markdown: string;
} & MarkdownOwnProps): React.JSX.Element {
  const componentsMap: Components = {
    a: ({ href, children }) => {
      const hrefStr = href ?? '#';
      const eipRegexp =
        /^https:\/\/eips\.ethereum\.org\/EIPS\/eip-(\d+)#wb-format=(short|long)$/i.exec(hrefStr);
      if (eipRegexp !== null) {
        const eip = lookupEip(+eipRegexp[1]);
        if (eip !== undefined) {
          return <EipLink eip={eip} format={eipRegexp[2] === 'short' ? 'SHORT' : 'LONG'} />;
        }
      }
      if (/^[-_\w+:]/.exec(hrefStr) !== null) {
        // External link.
        return <ExternalLink url={hrefStr}>{children}</ExternalLink>;
      }
      return <Link href={hrefStr}>{children}</Link>;
    },
    p: ({ children }) => (
      <Typography variant={pVariant} color={textColor} fontWeight={pFontWeight}>
        {children}
      </Typography>
    ),
    li: ({ children }) => (
      <li>
        <Typography variant={pVariant} color={textColor} fontWeight={pFontWeight}>
          {children}
        </Typography>
      </li>
    ),
  };
  markdown = trimWhitespacePrefix(markdown);
  if (markdownTransform !== undefined) {
    markdown = markdownTransform(markdown);
  }
  return (
    <StyledMarkdown pSpacing={pSpacing} liSpacing={liSpacing}>
      <Markdown components={componentsMap}>{markdown}</Markdown>
    </StyledMarkdown>
  );
}
