import { Typography } from '@mui/material'
import type React from 'react'

import { ContentType, type TypographicContent } from '@/types/content'
import { renderStrings } from '@/types/utils/text'

import { MarkdownTypography } from './MarkdownTypography'

export function RenderTypographicContent<
	TypographicContent_ extends TypographicContent,
>({
	content,
	textTransform,
	typography,
	strings,
}: {
	/** The typographic content to render. */
	content: TypographicContent_

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

	/** A set of strings to be expanded in the text. */
	strings?: TypographicContent_ extends TypographicContent<infer Strings> ? Strings : undefined,
}): React.JSX.Element {
	const processText = (text: string) => {
		if (textTransform) {
			text = textTransform(text)
		}

		if(strings)
			text = renderStrings(text, strings)

		return text.trim()
	}

	switch (content.contentType) {
		case ContentType.MARKDOWN:
			return (
				<MarkdownTypography
					markdownTransform={processText}
					{...typography}
				>
					{content.markdown}
				</MarkdownTypography>
			)
		case ContentType.TEXT:
			return (
				<Typography {...typography}>
					{processText(content.text)}
				</Typography>
			)
	}
}
