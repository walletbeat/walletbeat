import type { TypographyProps } from '@mui/material';
import type React from 'react';

import {
  MarkdownBase,
  type MarkdownOwnProps,
  deriveMarkdownPropsFromTypography,
} from './MarkdownBase';

interface MarkdownTypographyProps extends TypographyProps, MarkdownOwnProps {
  children: string;
}

/**
 * Styled Markdown Typography.
 */
export function MarkdownTypography(props: MarkdownTypographyProps): React.JSX.Element {
  const derivedMarkdownProps = deriveMarkdownPropsFromTypography(props, props);

  return <MarkdownBase markdown={props.children.trim()} {...derivedMarkdownProps} />;
}
