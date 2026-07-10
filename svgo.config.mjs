/**
 * @typedef {import('svgo').XastRoot} XastRoot
 * @typedef {import('svgo').XastNode} XastNode
 * @typedef {import('svgo').XastElement} XastElement
 * @typedef {import('svgo').Visitor} Visitor
 * @typedef {import('svgo').Config} Config
 */

/** @type {Config} */
export default {
	multipass: true,
	plugins: [
		{
			name: 'preset-default',
			params: {
				overrides: {
					// Keep `@media (prefers-color-scheme)` rules inside `<style>`;
					// inlining the non-media `svg { fill }` half breaks cascade / grows files.
					inlineStyles: false,
				},
			},
		},
		{
			name: 'removeAttrs',
			params: {
				attrs: ['svg:id', 'data-name'],
			},
		},
		{
			// Design tools (Illustrator, etc.) export generated class names like
			// `cls-1` / `st0` in both `class` attributes and embedded `<style>`
			// blocks. SVGO has no built-in that shortens those names while
			// keeping both in sync. Skip already-short names (`a`, `b`, …).
			name: 'minifyGeneratedClassNames',
			/**
			 * @param {XastRoot} root
			 * @returns {Visitor | null}
			 */
			fn(root) {
				// Letters + optional hyphen + digits, e.g. cls-1, st0, fil12.
				const generatedClass = /^[a-z]{2,5}-?\d+$/i
				/** @type {Set<string>} */
				const classNames = new Set()

				// 1. Collect every generated class referenced on elements or in CSS.
				/**
				 * @param {XastNode} node
				 */
				const visit = node => {
					if (node.type === 'element') {
						if (node.attributes.class) {
							for (const name of node.attributes.class.split(/\s+/)) {
								if (generatedClass.test(name)) {
									classNames.add(name)
								}
							}
						}

						if (node.name === 'style') {
							for (const child of node.children) {
								if (child.type === 'text') {
									for (const match of child.value.matchAll(/\.([a-z]{2,5}-?\d+)/gi)) {
										classNames.add(match[1])
									}
								}
							}
						}
					}

					if (node.type === 'root' || node.type === 'element') {
						for (const child of node.children) {
							visit(child)
						}
					}
				}

				visit(root)

				if (classNames.size === 0) {
					return null
				}

				// 2. Assign short stable names (`a`, `b`, … `aa`, …) in sorted order.
				const renamed = new Map(
					[...classNames].sort().map((name, index) => {
						let shortName = ''
						let value = index

						do {
							shortName = `${'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[value % 52]}${shortName}`
							value = Math.floor(value / 52) - 1
						} while (value >= 0)

						return [name, shortName]
					}),
				)

				// 3. Rewrite `class` attributes and matching selectors together.
				return {
					element: {
						/**
						 * @param {XastElement} node
						 */
						enter(node) {
							if (node.attributes.class) {
								node.attributes.class = node.attributes.class
									.split(/\s+/)
									.map(name => renamed.get(name) ?? name)
									.join(' ')
							}

							if (node.name === 'style') {
								for (const child of node.children) {
									if (child.type === 'text') {
										for (const [from, to] of renamed) {
											child.value = child.value.replaceAll(`.${from}`, `.${to}`)
										}
									}
								}
							}
						},
					},
				}
			},
		},
	],
	js2svg: {
		indent: 0,
		pretty: false,
		eol: 'lf',
		finalNewline: false,
		useShortTags: true,
	},
}
