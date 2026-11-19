import { type HastNode, htmlToHast } from 'satteri'

const nonProseElements = new Set(['code', 'pre', 'script', 'style', 'svg', 'template'])
const blockElements = new Set([
	'article',
	'blockquote',
	'br',
	'dd',
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
	'ol',
	'p',
	'section',
	'summary',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'ul',
])

/** Extract report prose, including custom evaluation components and security news. */
export function walletPageProse(html: string): string {
	function findArticle(node: HastNode): Extract<HastNode, { type: 'element' }> | null {
		if (node.type === 'element' && node.properties.id === 'top') {
			for (const child of node.children) {
				if (child.type === 'element' && child.tagName === 'article') {
					return child
				}
			}

			return null
		}

		if (node.type === 'root' || node.type === 'element') {
			for (const child of node.children) {
				const article = findArticle(child)

				if (article !== null) {
					return article
				}
			}
		}

		return null
	}

	const article = findArticle(htmlToHast(html))

	if (!article) {
		throw new Error('Wallet page has no report article')
	}

	function prose(node: HastNode): string {
		if (node.type === 'text') {
			return node.value
		}

		if (node.type !== 'element' || nonProseElements.has(node.tagName)) {
			return ''
		}

		const text = node.children.map(prose).join('')

		return blockElements.has(node.tagName) ? `\n${text}\n` : text
	}

	return prose(article).replace(/\s+/g, ' ').trim()
}
