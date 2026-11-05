import { type HastNode, htmlToHast } from 'satteri'

const excluded = new Set(['script', 'style', 'template'])
const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim()
const children = (node: HastNode): HastNode[] =>
	node.type === 'root' || node.type === 'element' ? node.children : []
const hasClass = (node: HastNode, name: string): boolean =>
	node.type === 'element' &&
	String(node.properties.className ?? '')
		.split(/[\s,]+/)
		.includes(name)

function text(node: HastNode): string {
	if (node.type === 'text') {
		return node.value
	}

	return node.type === 'element' && excluded.has(node.tagName)
		? ''
		: children(node).map(text).join('')
}
function find(node: HastNode, predicate: (node: HastNode) => boolean): HastNode | null {
	if (predicate(node)) {
		return node
	}

	for (const child of children(node)) {
		const match = find(child, predicate)

		if (match) {
			return match
		}
	}

	return null
}
function snapshot(root: HastNode) {
	const links: { href: string; text: string }[] = []
	const images: { src: string; alt: string }[] = []
	const headings: { tag: string; text: string }[] = []
	const code: string[] = []
	const disclosures: string[] = []
	const visit = (node: HastNode): void => {
		if (node.type === 'element') {
			if (excluded.has(node.tagName)) {
				return
			}

			const label = normalize(text(node))

			if (node.tagName === 'a') {
				links.push({ href: String(node.properties.href), text: label })
			}

			if (node.tagName === 'img' && !hasClass(node, 'wallet-icon')) {
				images.push({ src: String(node.properties.src), alt: String(node.properties.alt ?? '') })
			}

			if (/^h[1-6]$/.test(node.tagName)) {
				headings.push({ tag: node.tagName, text: label })
			}

			if (node.tagName === 'code') {
				code.push(text(node))
			}

			if (node.tagName === 'summary') {
				disclosures.push(label)
			}
		}

		children(node).forEach(visit)
	}

	visit(root)

	return { text: normalize(text(root)), links, images, headings, code, disclosures }
}

/** Semantic content excludes executable markup and the pipeline-specific wallet icon URL. */
export function reportContent(html: string) {
	const report = find(
		htmlToHast(html),
		node => node.type === 'element' && node.properties.id === 'top',
	)

	if (!report) {
		throw new Error('Wallet report missing')
	}

	return snapshot(report)
}
export function fragmentContent(html: string) {
	return snapshot(htmlToHast(html))
}

/** The native detail body covers typographic and custom renderers through the same contract. */
export function attributeDetailSnapshots(html: string): Record<string, string> {
	const result: Record<string, string> = {}
	const visit = (node: HastNode): void => {
		if (
			node.type === 'element' &&
			node.tagName === 'section' &&
			hasClass(node, 'attribute') &&
			typeof node.properties.id === 'string'
		) {
			const list = find(
				node,
				child =>
					child.type === 'element' &&
					child.tagName === 'ul' &&
					hasClass(child, 'attribute-rating-details'),
			)
			const body =
				list && children(list).find(child => child.type === 'element' && child.tagName === 'li')

			if (!body) {
				throw new Error(`Detail body missing: ${node.properties.id}`)
			}

			result[node.properties.id] = JSON.stringify(snapshot(body))
		}

		children(node).forEach(visit)
	}

	visit(htmlToHast(html))

	return result
}
