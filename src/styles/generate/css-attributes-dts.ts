import * as fs from 'fs/promises'
import * as path from 'path'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { getErrorMessage } from '@/types/errors'

import { type CssAttributeEntry, parseCssAttributes } from './css-attributes-generator-shared'

const repoRoot = getRepositoryRoot()
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
			: name === 'data-tabs'
				? [
						"| 'vertical'",
						"| 'compact'",
						"| 'scroll-inline'",
						"| `${'vertical' | 'compact' | 'scroll-inline'} ${string}`",
						'| boolean',
					].join('\n')
				: 'string | boolean'

const buildAttributeLines = (entry: CssAttributeEntry): string[] => {
	const valueType = attributeValueType(entry.name)

	if (!valueType.includes('\n')) {
		return [`\t${quote(entry.name)}?: ${valueType}`]
	}

	return [`\t${quote(entry.name)}?:`, ...valueType.split('\n').map(line => `\t\t${line}`)]
}

const toDtsContent = (entries: Map<string, CssAttributeEntry>): string =>
	(() => {
		const sortedEntries = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))

		return [
			'interface CssAttributes {',
			...sortedEntries.flatMap((entry, i) => [
				...buildDocLines(entry),
				...buildAttributeLines(entry),
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
	let existingContent: string | undefined

	try {
		existingContent = await fs.readFile(outputPath, 'utf-8')
	} catch {
		// File doesn't exist yet, skip the comparison
	}

	if (existingContent !== undefined && dtsContent.trim() === existingContent.trim()) {
		// Already up to date
		return
	}

	await fs.writeFile(outputPath, dtsContent, 'utf8')
	process.stderr.write(`Generated ${path.relative(repoRoot, outputPath)}\n`)
}

try {
	await main()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
