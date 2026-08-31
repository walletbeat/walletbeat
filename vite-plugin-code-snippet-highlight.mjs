import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * Vite plugin turning `.snippet` file imports (stored code snippets, see
 * src/tools/code-snippet-collector/) into modules whose default export is an
 * array of `SnippetRow`s (see src/schema/code-snippets.ts): one per code line
 * plus a `{ type: 'gap' }` divider between non-adjacent segments, each line
 * syntax-highlighted with Shiki at build time. Highlighting at build time
 * keeps Shiki (and its grammars) out of the client bundle while producing
 * identical output for server-side rendering and client hydration.
 *
 * The language comes from the source file's extension, which the snippet
 * naming scheme keeps right before the `.snippet` suffix
 * (e.g. `...--Wallet.L2232-L2242.ts.snippet` → `ts`).
 */

/**
 * Shiki themes used for all snippets
 */
const themes = { light: 'one-light', dark: 'one-dark-pro' }

/** Snippet source file extension → Shiki language identifier. */
const extensionToLanguage = {
	c: 'c',
	cjs: 'javascript',
	cpp: 'cpp',
	css: 'css',
	example: 'text',
	go: 'go',
	graphql: 'graphql',
	h: 'c',
	html: 'html',
	java: 'java',
	js: 'javascript',
	json: 'json',
	jsx: 'jsx',
	kt: 'kotlin',
	lock: 'text',
	md: 'markdown',
	mjs: 'javascript',
	py: 'python',
	rb: 'ruby',
	rs: 'rust',
	sh: 'shellscript',
	sol: 'solidity',
	swift: 'swift',
	toml: 'toml',
	ts: 'typescript',
	tsx: 'tsx',
	vue: 'vue',
	xml: 'xml',
	yaml: 'yaml',
	yml: 'yaml',
}

/** @type {Promise<import('shiki').Highlighter> | undefined} */
let highlighterPromise

/** @returns {Promise<import('shiki').Highlighter>} */
function getHighlighter() {
	if (highlighterPromise === undefined) {
		highlighterPromise = import('shiki').then(shiki =>
			shiki.createHighlighter({ langs: [], themes: Object.values(themes) }),
		)
	}

	return highlighterPromise
}

/** @type {Set<string>} */
const loadedLanguages = new Set()

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * The Shiki language for a snippet file path. Throws for any extension not
 * present in `extensionToLanguage`, since that's either a typo or a new
 * extension that needs to be classified there (as a real language, or as
 * `'text'` if it shouldn't be highlighted).
 *
 * @param {string} filePath
 * @returns {string}
 */
function snippetLanguage(filePath) {
	const parts = path.basename(filePath).split('.')
	const extension = parts.length < 2 ? '' : parts[parts.length - 2]

	if (!Object.hasOwn(extensionToLanguage, extension)) {
		throw new Error(
			`Unknown snippet extension "${extension}" in ${filePath}. Add it to extensionToLanguage in vite-plugin-code-snippet-highlight.mjs (as 'text' if it shouldn't be highlighted).`,
		)
	}

	return extensionToLanguage[/** @type {keyof typeof extensionToLanguage} */ (extension)]
}

/**
 * The Vite plugin. Typed through Astro's re-exported Vite config types since
 * Vite is not a direct dependency of this project.
 *
 * @returns {NonNullable<NonNullable<import('astro').AstroUserConfig['vite']>['plugins']>[number]}
 */
export function codeSnippetHighlight() {
	return {
		name: 'walletbeat:code-snippet-highlight',
		enforce: 'pre',
		/**
		 * @param {string} id
		 * @returns {Promise<string | null>}
		 */
		async load(id) {
			const [filePath] = id.split('?')

			if (!filePath.endsWith('.snippet')) {
				return null
			}

			/** @type {import('./src/schema/code-snippets').StoredSnippetContent} */
			const content = JSON.parse(await fs.readFile(filePath, 'utf8'))
			const language = snippetLanguage(filePath)
			const highlighter = await getHighlighter()

			if (!loadedLanguages.has(language)) {
				await highlighter.loadLanguage(
					/** @type {import('shiki').BundledLanguage | 'text'} */ (language),
				)
				loadedLanguages.add(language)
			}

			/** @type {import('./src/schema/code-snippets').SnippetRow[]} */
			const rows = []

			content.segments.forEach((segment, segmentIndex) => {
				if (segmentIndex > 0) {
					rows.push({ type: 'gap' })
				}

				const tokenLines = highlighter.codeToTokensWithThemes(segment.lines.join('\n'), {
					lang: /** @type {import('shiki').BundledLanguage | 'text'} */ (language),
					themes,
				})

				tokenLines.forEach((lineTokens, lineIndex) => {
					const lineNumber = segment.startLine + lineIndex
					const html = lineTokens
						.map(token => {
							const light = token.variants.light?.color
							const dark = token.variants.dark?.color

							return light === undefined && dark === undefined
								? escapeHtml(token.content)
								: `<span style="color:light-dark(${light ?? 'inherit'},${dark ?? 'inherit'})">${escapeHtml(token.content)}</span>`
						})
						.join('')

					rows.push({
						highlighted:
							lineNumber >= content.highlightFirstLine && lineNumber <= content.highlightLastLine,
						html,
						number: lineNumber,
						type: 'line',
					})
				})
			})

			return `export default ${JSON.stringify(rows)}\n`
		},
	}
}
