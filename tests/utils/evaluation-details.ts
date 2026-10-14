import { DOMParser, type Node } from '@xmldom/xmldom'
import { render } from 'svelte/server'

import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { normalizeMarkdownBlankLines } from '@/utils/markdown-utils'
import EvaluationDetails from '@/views/attributes/EvaluationDetails.svelte'

const BLOCK_ELEMENTS = new Set([
	'address',
	'article',
	'aside',
	'blockquote',
	'dd',
	'details',
	'div',
	'dl',
	'dt',
	'figcaption',
	'figure',
	'footer',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'hr',
	'li',
	'main',
	'nav',
	'ol',
	'p',
	'section',
	'summary',
	'table',
	'td',
	'th',
	'tr',
	'ul',
])

const NON_TEXT_ELEMENTS = new Set(['script', 'style', 'svg', 'template'])

/** Server-render the details of a wallet's evaluation as the wallet page displays them. */
export function renderEvaluationDetailsHtml(
	wallet: RatedWallet<string>,
	evaluation: Evaluation<OutcomeMetadata>,
): string {
	return render(EvaluationDetails, { props: { wallet, evaluation } }).body
}

function nodeToMarkdown(node: Node): string {
	if (node.nodeType === node.TEXT_NODE) {
		return (node.nodeValue ?? '').replace(/\s+/g, ' ')
	}

	if (node.nodeType !== node.ELEMENT_NODE && node.nodeType !== node.DOCUMENT_NODE) {
		return ''
	}

	const name = node.localName ?? ''

	if (NON_TEXT_ELEMENTS.has(name)) {
		return ''
	}

	if (name === 'br') {
		return '\n'
	}

	if (name === 'pre') {
		return `\n\n\`\`\`\n${node.textContent ?? ''}\n\`\`\`\n\n`
	}

	if (name === 'code') {
		return `\`${node.textContent ?? ''}\``
	}

	const children = Array.from(node.childNodes, nodeToMarkdown).join('')

	return BLOCK_ELEMENTS.has(name) ? `\n\n${children}\n\n` : children
}

/**
 * Extract the visible text of server-rendered HTML as Markdown for grammar linting.
 * Block elements become paragraphs separated by blank lines, and inline `<code>`
 * becomes a code span.
 */
export function renderedHtmlToMarkdown(html: string): string {
	const markdown = nodeToMarkdown(new DOMParser().parseFromString(html, 'text/html'))

	return normalizeMarkdownBlankLines(
		markdown
			.split('\n')
			.map(line => line.trim())
			.join('\n'),
	).trim()
}
