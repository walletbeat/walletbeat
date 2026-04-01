import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.join(__dirname, '..', '..', '..')
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
								description: `Token for \`${entry.name}~='${value}'\``,
							})),
					}),
		})),
})

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const data = toCustomData(parseCssAttributes(css))

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(data, null, '\t')}\n`, 'utf8')
	process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}
