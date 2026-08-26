/**
 * Narrow inline prose tokens for canonical structured detail models.
 *
 * Canonical models never store Markdown or HTML. When a sentence needs a link
 * (an entity page, an EIP, a chain explorer), it is expressed as a sequence of
 * spans that each adapter formats in its own syntax.
 */

/** A run of plain text within an inline sentence. */
export interface InlineTextSpan {
	kind: 'text'

	/** Plain text. May contain `{{WALLET_NAME}}`-style template placeholders. */
	text: string
}

/** A linked run of text within an inline sentence. */
export interface InlineLinkSpan {
	kind: 'link'

	/** Plain text of the link label. May contain template placeholders. */
	text: string

	/** Absolute URL, or a site-root-relative path such as `/entity/foo`. */
	url: string
}

export type InlineSpan = InlineTextSpan | InlineLinkSpan

/** A format-neutral sentence or fragment made of inline spans. */
export type InlineText = InlineSpan[]

/** Build an inline text made of a single plain-text span. */
export function inlineText(text: string): InlineText {
	return [{ kind: 'text', text }]
}

/** Build a single inline link span. */
export function inlineLink(text: string, url: string): InlineLinkSpan {
	return { kind: 'link', text, url }
}
