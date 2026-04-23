import * as fs from 'fs/promises'
import * as path from 'path'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { getErrorMessage } from '@/types/errors'

import { type CssAttributeEntry, parseCssAttributes } from './css-attributes-generator-shared'

type HtmlCustomData = {
	version: 1.1
	globalAttributes: Array<{
		name: string
		description?: string
		values?: Array<{
			name: string
			description?: string
		}>
	}>
}

const repoRoot = getRepositoryRoot()
const cssAttributesCssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
const outputPath = path.join(repoRoot, '.vscode', 'walletbeat.html-data.json')

const buildMarkdownDoc = (entry: CssAttributeEntry): string | undefined => {
	const rawBody = entry.docMarkdown?.trim()

	if (rawBody === undefined || rawBody.length === 0) {
		return undefined
	}

	const withHeading = rawBody.includes('## [data-')
		? rawBody
		: `## ${entry.sourceSelector}\n\n${rawBody}`
	const withSource = withHeading.includes('@see')
		? withHeading
		: `${withHeading}\n\n### Source\n@see [src/styles/css-attributes.css](./css-attributes.css) \`${entry.sourceSelector}\``

	return withSource
}

const buildDescription = (entry: CssAttributeEntry): string | undefined => {
	return buildMarkdownDoc(entry)
}

const toCustomData = (entries: Map<string, CssAttributeEntry>): HtmlCustomData => ({
	version: 1.1,
	globalAttributes: [...entries.values()]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(entry => ({
			name: entry.name,
			description: buildDescription(entry),
			...(entry.values.size === 0
				? {}
				: {
						values: [...entry.values]
							.sort((a, b) => a.localeCompare(b))
							.map(value => ({
								name: value,
								description: `\`[${entry.name}~="${value}"]\``,
							})),
					}),
		})),
})

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const data = toCustomData(parseCssAttributes(css))
	let existingContent: string | undefined

	try {
		existingContent = await fs.readFile(outputPath, 'utf-8')
	} catch {
		// File doesn't exist yet, skip the comparison
	}

	if (existingContent !== undefined && JSON.stringify(data).trim() === existingContent.trim()) {
		// Already up to date
		return
	}

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(data, null, '\t')}\n`, 'utf8')
	process.stderr.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
