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

	/** Whether the run is strongly emphasized (bold in visual adapters). */
	strong?: boolean

	/** Whether the run is emphasized (italic in visual adapters). */
	emphasis?: boolean

	/** Whether the run is code (monospace in visual adapters). */
	code?: boolean
}

/** A linked run of text within an inline sentence. */
export interface InlineLinkSpan {
	kind: 'link'

	/** Plain text of the link label. May contain template placeholders. */
	text: string

	/** Absolute URL, or a site-root-relative path such as `/entity/foo`. */
	url: string

	/** Whether the link label is strongly emphasized (bold in visual adapters). */
	strong?: boolean
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

/** Build a single emphasized (italic) inline span. */
export function inlineEmphasis(text: string): InlineTextSpan {
	return { kind: 'text', text, emphasis: true }
}

/** Build a single strongly emphasized (bold) inline span. */
export function inlineStrong(text: string): InlineTextSpan {
	return { kind: 'text', text, strong: true }
}

/** Build a single code inline span. */
export function inlineCode(text: string): InlineTextSpan {
	return { kind: 'text', text, code: true }
}

/** What may be interpolated into an `inline` template. */
export type InlineValue = string | InlineSpan | InlineSpan[]

/**
 * Author an inline sentence as a tagged template.
 *
 * Static text is whitespace-normalized so authored indentation never reaches
 * an adapter, and interpolated spans keep their own semantics:
 *
 * ```ts
 * inline`Sending funds relies on ${inlineEntity(resolver)} for address resolution.`
 * ```
 */
export function inline(strings: TemplateStringsArray, ...values: InlineValue[]): InlineText {
	const spans: InlineSpan[] = []

	const pushText = (text: string): void => {
		if (text === '') {
			return
		}

		const previous = spans.at(-1)

		if (
			previous?.kind === 'text' &&
			previous.strong !== true &&
			previous.emphasis !== true &&
			previous.code !== true
		) {
			previous.text += text

			return
		}

		spans.push({ kind: 'text', text })
	}

	strings.forEach((literal, index) => {
		pushText(literal.replaceAll(/\s+/gu, ' '))

		const value = values[index]

		if (value === undefined) {
			return
		}

		if (typeof value === 'string') {
			pushText(value)

			return
		}

		for (const span of Array.isArray(value) ? value : [value]) {
			spans.push(span)
		}
	})

	const first = spans.at(0)
	const last = spans.at(-1)

	if (first?.kind === 'text') {
		first.text = first.text.replace(/^ /u, '')
	}

	if (last?.kind === 'text') {
		last.text = last.text.replace(/ $/u, '')
	}

	return spans.filter(span => span.text !== '')
}
