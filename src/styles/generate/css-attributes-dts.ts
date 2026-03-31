import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { type CssAttributeEntry, parseCssAttributes } from './css-attributes-generator-shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.join(__dirname, '..', '..', '..')
const cssAttributesCssPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.css')
const outputPath = path.join(repoRoot, 'src', 'styles', 'css-attributes.d.ts')

const quote = (value: string): string =>
	`'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const buildMarkdownDoc = (entry: CssAttributeEntry): string => {
	const rawBody = entry.docMarkdown?.trim() ?? ''
	const withHeading = rawBody.includes('## [data-')
		? rawBody
		: `## ${entry.sourceSelector}\n\n${rawBody}`

	return withHeading.includes('@see')
		? withHeading
		: `${withHeading}\n\n### Source\n@see [src/styles/css-attributes.css](./css-attributes.css) \`${entry.sourceSelector}\``
}

const buildDocLines = (entry: CssAttributeEntry): string[] => {
	return [
		'\t/**',
		...buildMarkdownDoc(entry)
			.split('\n')
			.map(line => (line.length === 0 ? '\t *' : `\t * ${line}`)),
		'\t */',
	]
}

const attributeValueType = (name: string): string =>
	name === 'data-link'
		? "'camouflaged' | boolean"
		: name === 'data-pressable'
			? "'to-containing' | boolean"
			: 'string | boolean'

const toDtsContent = (entries: Map<string, CssAttributeEntry>): string =>
	(() => {
		const sortedEntries = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))

		return [
			'interface CssAttributes {',
			...sortedEntries.flatMap((entry, i) => [
				...buildDocLines(entry),
				`\t${quote(entry.name)}?: ${attributeValueType(entry.name)}`,
				...(i < sortedEntries.length - 1 ? [''] : []),
			]),
			'}',
			'',
			'declare namespace astroHTML.JSX {',
			'\tinterface HTMLAttributes extends CssAttributes {}',
			'}',
			'',
			"declare module 'svelte/elements' {",
			'\texport interface HTMLAttributes<_T extends EventTarget> extends CssAttributes {}',
			'}',
			'',
		].join('\n')
	})()

const main = async (): Promise<void> => {
	const css = await fs.readFile(cssAttributesCssPath, 'utf8')
	const dtsContent = toDtsContent(parseCssAttributes(css))

	await fs.writeFile(outputPath, dtsContent, 'utf8')
	process.stdout.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}
