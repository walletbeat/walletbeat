import { parseEipMagicUrl, stripEipMagicUrls } from '@/schema/eips'

/**
 * A piece of Markdown-rendered HTML, split so that EIP links can be rendered
 * as components while everything else stays as plain HTML.
 */
export type EipLinkHtmlNode =
	/** HTML that contains no EIP link. */
	| { type: 'html'; html: string }

	/** An element that contains an EIP link somewhere among its descendants. */
	| {
			type: 'element'
			tag: string
			attributes: Record<string, string>
			children: EipLinkHtmlNode[]
	  }

	/** An EIP link (a Markdown link to an EIP magic URL). */
	| { type: 'eipLink'; eipNumber: number; url: string; labelHtml: string }

interface ParsedElement {
	tag: string
	attributes: Record<string, string>
	start: number
	contentStart: number
	contentEnd: number
	end: number
	children: ParsedElement[]
}

const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>/g
const attributePattern = /([a-zA-Z-]+)="([^"]*)"/g
const voidTags = new Set(['br', 'hr', 'img', 'input'])

function decodeHtmlAttribute(value: string): string {
	return value
		.replaceAll('&quot;', '"')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&amp;', '&')
}

/**
 * Parse the element structure of HTML produced by micromark.
 * Text is not represented; it is recovered from offsets into the source.
 * Returns null if the HTML is not well-formed.
 */
function parseElements(html: string): ParsedElement[] | null {
	const root: ParsedElement[] = []
	const stack: ParsedElement[] = []

	for (const match of html.matchAll(tagPattern)) {
		const [whole, closing, rawTag, rawAttributes, selfClosing] = match
		const tag = rawTag.toLowerCase()
		const siblings = stack.length > 0 ? stack[stack.length - 1].children : root

		if (closing !== '') {
			const open = stack.pop()

			if (open?.tag !== tag) {
				return null
			}

			open.contentEnd = match.index
			open.end = match.index + whole.length
			continue
		}

		const element: ParsedElement = {
			tag,
			attributes: Object.fromEntries(
				Array.from(rawAttributes.matchAll(attributePattern), ([, name, value]) => [
					name,
					decodeHtmlAttribute(value),
				]),
			),
			start: match.index,
			contentStart: match.index + whole.length,
			contentEnd: match.index + whole.length,
			end: match.index + whole.length,
			children: [],
		}

		siblings.push(element)

		if (selfClosing === '' && !voidTags.has(tag)) {
			stack.push(element)
		}
	}

	return stack.length === 0 ? root : null
}

function eipLinkOf(element: ParsedElement): { eipNumber: number; url: string } | null {
	if (element.tag !== 'a' || element.attributes.href === undefined) {
		return null
	}

	return parseEipMagicUrl(element.attributes.href)
}

function containsEipLink(element: ParsedElement): boolean {
	return eipLinkOf(element) !== null || element.children.some(containsEipLink)
}

function toNodes(
	html: string,
	elements: ParsedElement[],
	start: number,
	end: number,
): EipLinkHtmlNode[] {
	const nodes: EipLinkHtmlNode[] = []
	let pendingStart = start

	const flushHtml = (upTo: number): void => {
		if (upTo > pendingStart) {
			nodes.push({ type: 'html', html: html.slice(pendingStart, upTo) })
		}
	}

	for (const element of elements) {
		if (!containsEipLink(element)) {
			continue
		}

		flushHtml(element.start)
		pendingStart = element.end

		const eipLink = eipLinkOf(element)

		if (eipLink !== null) {
			nodes.push({
				type: 'eipLink',
				eipNumber: eipLink.eipNumber,
				url: eipLink.url,
				labelHtml: stripEipMagicUrls(html.slice(element.contentStart, element.contentEnd)),
			})
		} else {
			nodes.push({
				type: 'element',
				tag: element.tag,
				attributes: element.attributes,
				children: toNodes(html, element.children, element.contentStart, element.contentEnd),
			})
		}
	}

	flushHtml(end)

	return nodes
}

/**
 * Split HTML rendered by micromark into nodes, isolating links to EIP magic
 * URLs (see `eipMarkdownLink` and friends) so that they can be rendered with
 * an EIP tooltip. Subtrees without EIP links are kept as plain HTML strings.
 *
 * If the HTML cannot be parsed, it is returned as a single HTML node with
 * magic URLs replaced by plain EIP URLs.
 */
export function splitEipLinks(html: string): EipLinkHtmlNode[] {
	const elements = parseElements(html)

	if (elements === null) {
		return [{ type: 'html', html: stripEipMagicUrls(html) }]
	}

	return toNodes(html, elements, 0, html.length)
}
