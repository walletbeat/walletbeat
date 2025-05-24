import { Typography } from '@mui/material'

import { type TypographicContent as _TypographicContent, ContentType } from '@/types/content'
import type { Strings } from '@/types/utils/string-templates'
import { renderStrings } from '@/types/utils/text'

import { MarkdownTypography } from './MarkdownTypography'

type Props<TypographicContent extends _TypographicContent> = {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Explicitly handle null case for clarity
export function RenderTypographicContent<TypographicContent extends _TypographicContent<any>>(
	props: Props<TypographicContent> & (
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments -- Explicitly handle null case for clarity
		TypographicContent extends _TypographicContent<null> ?
			{ strings?: never }
		: TypographicContent extends _TypographicContent<infer _Strings> ?
			{ strings: _Strings }
		:
			never
	),
): React.JSX.Element
export function RenderTypographicContent(
	props: Props<_TypographicContent> & ({ strings?: never } | { strings: Strings }),
) {
	const { content, textTransform, typography, strings } = props

	const processText = (text: string) => {
		if (textTransform !== undefined) {
			text = textTransform(text)
		}

		if (strings !== undefined)
			text = renderStrings(text, props.strings)

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
