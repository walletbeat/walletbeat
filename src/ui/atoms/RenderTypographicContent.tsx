import { Typography } from '@mui/material'
import type React from 'react'

import { ContentType, type TypographicContent as _TypographicContent } from '@/types/content'
import { renderStrings } from '@/types/utils/text'

import { MarkdownTypography } from './MarkdownTypography'

type BaseProps<TypographicContent extends _TypographicContent> = {
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
}

export function RenderTypographicContent<TypographicContent extends _TypographicContent>(
	props: (TypographicContent extends _TypographicContent<null>
		? object
		: TypographicContent extends _TypographicContent<infer Strings>
			? { strings: Strings }
			: never) &
		BaseProps<_TypographicContent>,
): React.JSX.Element {
	const { content, textTransform, typography } = props
	const strings = Object.hasOwn(content, 'strings') ? content.strings : undefined
	const processText = (text: string) => {
		if (textTransform !== undefined) {
			text = textTransform(text)
		}

		if (strings !== undefined) {
			text = renderStrings(text, strings)
		}

		return text.trim()
	}

	switch (content.contentType) {
		case ContentType.MARKDOWN:
			return (
				<MarkdownTypography markdownTransform={processText} {...typography}>
					{content.markdown}
				</MarkdownTypography>
			)
		case ContentType.TEXT:
			return <Typography {...typography}>{processText(content.text)}</Typography>
	}
}
