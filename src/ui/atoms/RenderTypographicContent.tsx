import type React from 'react'
import { ContentType, type TypographicContent } from '@/types/content'
import { Typography } from '@mui/material'
import { MarkdownTypography } from './MarkdownTypography'

export function RenderTypographicContent({
	content,
	textTransform,
	typography,
}: {
	/** The typographic content to render. */
	content: TypographicContent

	/**
	 * A text transformation applied to the text.
	 * This happens after expansion of the text, but before rendering.
	 */
	textTransform?: (resolvedText: string) => string

	/** A subset of supported typography props. */
	typography?: Partial<
		Pick<
			React.ComponentProps<typeof Typography>,
			| 'color'
			| 'fontSize'
			| 'fontWeight'
			| 'fontStyle'
			| 'lineHeight'
			| 'marginBottom'
			| 'marginTop'
			| 'paddingBottom'
			| 'paddingTop'
			| 'variant'
		>
	>
}): React.JSX.Element {
	switch (content.contentType) {
		case ContentType.MARKDOWN:
			return (
				<MarkdownTypography markdownTransform={textTransform} {...typography}>
					{content.markdown}
				</MarkdownTypography>
			)
		case ContentType.TEXT:
			return (
				<Typography {...typography}>
					{textTransform === undefined ? content.text.trim() : textTransform(content.text).trim()}
				</Typography>
			)
	}
}
