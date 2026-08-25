import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * Vite plugin turning `.snippet` file imports (stored code snippets, see
 * src/tools/code-snippet-collector/) into modules whose default export is an
 * array of HTML strings: one per code line, syntax-highlighted with Shiki at
 * build time. Highlighting at build time keeps Shiki (and its grammars) out
 * of the client bundle while producing identical output for server-side
 * rendering and client hydration.
 *
 * The language comes from the source file's extension, which the snippet
 * naming scheme keeps right before the `.snippet` suffix
 * (e.g. `...--Wallet.L2232-L2242.ts.snippet` → `ts`).
 */

/** Shiki theme used for all snippets. The site is dark-only. */
const theme = 'one-dark-pro'

/** Snippet source file extension → Shiki language identifier. */
const extensionToLanguage = {
	c: 'c',
	cjs: 'javascript',
	cpp: 'cpp',
	css: 'css',
	go: 'go',
	graphql: 'graphql',
	h: 'c',
	html: 'html',
	java: 'java',
	js: 'javascript',
	json: 'json',
	jsx: 'jsx',
	kt: 'kotlin',
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
			shiki.createHighlighter({ langs: [], themes: [theme] }),
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
 * The Shiki language for a snippet file path, or undefined for extensions
 * without a known grammar (rendered as plain escaped text).
 *
 * @param {string} filePath
 * @returns {string | undefined}
 */
function snippetLanguage(filePath) {
	const parts = path.basename(filePath).split('.')

	if (parts.length < 2) {
		return undefined
	}

	const extension = parts[parts.length - 2]

	return Object.hasOwn(extensionToLanguage, extension)
		? extensionToLanguage[/** @type {keyof typeof extensionToLanguage} */ (extension)]
		: undefined
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

			const code = (await fs.readFile(filePath, 'utf8')).replace(/\n$/, '')
			const language = snippetLanguage(filePath)

			/** @type {string[]} */
			let htmlLines

			if (language === undefined) {
				htmlLines = code.split('\n').map(escapeHtml)
			} else {
				const highlighter = await getHighlighter()

				if (!loadedLanguages.has(language)) {
					await highlighter.loadLanguage(/** @type {import('shiki').BundledLanguage} */ (language))
					loadedLanguages.add(language)
				}

				const { tokens } = highlighter.codeToTokens(code, {
					lang: /** @type {import('shiki').BundledLanguage} */ (language),
					theme,
				})

				htmlLines = tokens.map(lineTokens =>
					lineTokens
						.map(token =>
							token.color === undefined
								? escapeHtml(token.content)
								: `<span style="color:${token.color}">${escapeHtml(token.content)}</span>`,
						)
						.join(''),
				)
			}

			return `export default ${JSON.stringify(htmlLines)}\n`
		},
	}
}
