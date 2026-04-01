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

const buildMarkdownDocVscode = (entry: CssAttributeEntry): string | undefined => {
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

const toCustomData = (entries: Map<string, CssAttributeEntry>): HtmlCustomData => ({
	version: 1.1,
	globalAttributes: [...entries.values()]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(entry => ({
			name: entry.name,
			description: buildMarkdownDocVscode(entry),
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

/** JSON (with trailing newline) for `.vscode/walletbeat.css-attributes.json`. */
export const generateWalletbeatHtmlDataJson = (cssSource: string): string => {
	const data = toCustomData(parseCssAttributes(cssSource))

	return `${JSON.stringify(data, null, '\t')}\n`
}

const quote = (value: string): string =>
	`'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const buildMarkdownDocTypescript = (entry: CssAttributeEntry): string => {
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
		...buildMarkdownDocTypescript(entry)
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

/** Contents for `src/styles/css-attributes.d.ts`. */
export const generateCssAttributesDts = (cssSource: string): string =>
	toDtsContent(parseCssAttributes(cssSource))
