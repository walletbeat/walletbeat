export interface InlineTextSpan {
	kind: 'text'

	/** Plain text. May contain `{{WALLET_NAME}}`-style template placeholders. */
	text: string

	strong?: boolean

	emphasis?: boolean

	code?: boolean
}

export interface InlineLinkSpan {
	kind: 'link'

	/** Plain text of the link label. May contain template placeholders. */
	text: string

	/** Absolute URL, or a site-root-relative path such as `/entity/foo`. */
	url: string

	strong?: boolean
}

export type InlineSpan = InlineTextSpan | InlineLinkSpan

export type InlineText = InlineSpan[]

export function inlineText(text: string): InlineText {
	return [{ kind: 'text', text }]
}

export function inlineLink(text: string, url: string): InlineLinkSpan {
	return { kind: 'link', text, url }
}

export function inlineEmphasis(text: string): InlineTextSpan {
	return { kind: 'text', text, emphasis: true }
}

export function inlineStrong(text: string): InlineTextSpan {
	return { kind: 'text', text, strong: true }
}

export function inlineCode(text: string): InlineTextSpan {
	return { kind: 'text', text, code: true }
}

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
