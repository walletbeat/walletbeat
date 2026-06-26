import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import * as prettier from 'prettier'
import { type Config, loadConfig, optimize } from 'svgo'
import svgtofont from 'svgtofont'

import { getRepositoryRoot } from '@/tests/utils/codebase'

const require = createRequire(import.meta.url)
const requireFromSvgToFont = createRequire(require.resolve('svgtofont'))

type FontConverter = (buffer: Buffer) => Uint8Array
const isFontConverter = (value: unknown): value is FontConverter => typeof value === 'function'

const requireFontConverter = (packageName: string): FontConverter => {
	const module = requireFromSvgToFont(packageName) as unknown
	const converter = isFontConverter(module)
		? module
		: typeof module === 'object' &&
			  module !== null &&
			  'default' in module &&
			  isFontConverter(module.default)
			? module.default
			: null

	if (converter === null) {
		throw new Error(`Cannot load ${packageName} from svgtofont dependencies.`)
	}

	return converter
}

const ttf2eot = requireFontConverter('ttf2eot')
const ttf2woff = requireFontConverter('ttf2woff')
const ttf2woff2 = requireFontConverter('ttf2woff2')

// Color attributes that can appear on SVG elements
const SVG_COLOR_ATTRIBUTES = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color']

// Regex to match presentation attributes like fill="..." or stroke="..."
const PRESENTATION_ATTR_REGEX = new RegExp(
	`(?:${SVG_COLOR_ATTRIBUTES.join('|')})\\s*=\\s*["']([^"']*)["']`,
	'gi',
)

// Regex to match CSS-in-style declarations like fill: ...; or stroke: ...;
const STYLE_COLOR_ATTR_REGEX = new RegExp(
	`(?:${SVG_COLOR_ATTRIBUTES.join('|')})\\s*:\\s*([^;}"']+);?`,
	'gi',
)

/** Keywords that are explicitly allowed (non-color values) */
const ALLOWED_KEYWORDS = new Set([
	'none',
	'inherit',
	'currentcolor',
	'transparent',
	'initial',
	'unset',
])

/**
 * Check if a hex color represents black (R=G=B=0). Alpha channel is allowed to vary.
 */
function isBlackHex(hex: string): boolean {
	const cleaned = hex.replace(/^#/, '')

	// #RGB
	if (cleaned.length === 3) {
		return cleaned[0] === cleaned[1] && cleaned[1] === cleaned[2] && cleaned[0] === '0'
	}

	// #RGBA
	if (cleaned.length === 4) {
		return cleaned[0] === cleaned[1] && cleaned[1] === cleaned[2] && cleaned[0] === '0'
	}

	// #RRGGBB
	if (cleaned.length === 6) {
		return (
			cleaned[0] === cleaned[1] &&
			cleaned[1] === cleaned[2] &&
			cleaned[2] === cleaned[3] &&
			cleaned[3] === cleaned[4] &&
			cleaned[4] === cleaned[5] &&
			cleaned[0] === '0'
		)
	}

	// #RRGGBBAA
	if (cleaned.length === 8) {
		return (
			cleaned[0] === cleaned[1] &&
			cleaned[1] === cleaned[2] &&
			cleaned[2] === cleaned[3] &&
			cleaned[3] === cleaned[4] &&
			cleaned[4] === cleaned[5] &&
			cleaned[0] === '0'
		)
	}

	return false
}

/**
 * Parse a numeric color component (integer 0-255 or percentage 0%-100%).
 * Returns the value as a number 0-255, or -1 if not zero.
 */
function parseColorComponent(component: string): number {
	const trimmed = component.trim()

	if (trimmed.endsWith('%')) {
		const pct = parseFloat(trimmed.slice(0, -1))

		return pct === 0 ? 0 : -1
	}

	const val = parseFloat(trimmed)

	return val === 0 ? 0 : -1
}

/**
 * Check if an rgb()/rgba() color represents black (R=G=B=0). Alpha is allowed to vary.
 */
function isBlackRgb(color: string): boolean {
	// Match rgb(...) or rgba(...) with either comma-separated or space-separated values
	const match = color.match(/^(?:rgba?)\(\s*(.+?)\s*(?:\/\s*(.+?)\s*)?\)$/i)

	if (!match) {
		return false
	}

	const group1 = match[1].trim()
	// Alpha from slash syntax is in group2
	// If no slash, alpha might be comma-separated inside group1

	let components: string[]

	if (group1.includes(',')) {
		components = group1.split(',')
	} else {
		// Space-separated: "0 0 0" or "0 0 0 / 0.5"
		components = group1.split(/\s+/)
	}

	if (components.length === 4) {
		components.pop() // Strip alpha part.
	}

	if (components.length < 3) {
		return false
	}

	const r = parseColorComponent(components[0])
	const g = parseColorComponent(components[1])
	const b = parseColorComponent(components[2])

	return r === 0 && g === 0 && b === 0
}

/**
 * Validate that all colors in an SVG are black or transparent black only.
 * Returns errors found.
 */
export function validateSvgIsMonochromeBlack(svgContent: string): string[] {
	const errors: string[] = []

	// Check presentation attributes
	for (const match of svgContent.matchAll(PRESENTATION_ATTR_REGEX)) {
		const attrName = match[0].split(/\s*=/)[0].trim()
		const rawValue = match[1].trim()

		validateSingleColor(rawValue, `${attrName}`, errors)
	}

	// Check CSS-in-style declarations
	for (const match of svgContent.matchAll(STYLE_COLOR_ATTR_REGEX)) {
		const fullMatch = match[0]
		const attrName = fullMatch.split(':')[0].trim()
		const rawValue = match[1].trim()

		validateSingleColor(rawValue, `${attrName} (in style)`, errors)
	}

	return errors
}

function validateSingleColor(rawValue: string, attrLabel: string, errors: string[]): void {
	const value = rawValue.trim().toLowerCase()

	if (!value) {
		return
	}

	// Allow special keywords
	if (ALLOWED_KEYWORDS.has(value)) {
		return
	}

	// Check hex colors
	if (value.startsWith('#')) {
		if (!isBlackHex(value)) {
			errors.push(`${attrLabel} has non-black color: ${rawValue}`)
		}

		return
	}

	// Check rgb()/rgba()
	if (value.startsWith('rgb(')) {
		if (!isBlackRgb(rawValue)) {
			errors.push(`${attrLabel} has non-black color: ${rawValue}`)
		}

		return
	}

	// Check hsl()/hsla() - these are not black (unless degenerate edge cases)
	if (value.startsWith('hsl(')) {
		errors.push(`${attrLabel} has non-black color (HSL): ${rawValue}`)

		return
	}

	// Check named colors - if it's a single word that's not a known keyword,
	// it might be a named color. The only allowed named color is 'black'.
	if (!value.includes(' ') && !value.includes('(') && value !== 'black') {
		errors.push(`${attrLabel} has non-black named color: ${rawValue}`)

		return
	}
}

export type IconUnicodeSequences = Readonly<Record<string, string>>

export const iconFontStartCharCode = 0xea01
export const maxIconFontChars = 255
const iconFontGeneratorVersion = 'emoji-unicode-sequence-cmap14-v1'

const svgToFontOptions = {
	startUnicode: iconFontStartCharCode,
	svgicons2svgfont: {
		fontHeight: 1000,
		normalize: true,
	},
	svg2ttf: {
		ts: 0,
	},
} as const

const generatedFontFormats = ['ttf', 'eot', 'woff', 'woff2', 'svg'] as const

export const duplicateIconFontUnicodeSequences = (
	iconUnicodeSequences: IconUnicodeSequences,
): Record<string, string[]> =>
	Object.entries(iconUnicodeSequences).reduce<Record<string, string[]>>(
		(duplicates, [iconName, unicodeSequence]) => {
			duplicates[unicodeSequence] ??= []
			duplicates[unicodeSequence].push(iconName)

			return duplicates
		},
		{},
	)

export const repeatedIconFontUnicodeSequences = (
	iconUnicodeSequences: IconUnicodeSequences,
): Record<string, string[]> =>
	Object.fromEntries(
		Object.entries(duplicateIconFontUnicodeSequences(iconUnicodeSequences)).filter(
			([_unicodeSequence, iconNames]) => iconNames.length > 1,
		),
	)

const iconFontCSSRuleForIcon = (key: string, iconContent: string): string =>
	[`&[data-icon~="${key}"] {`, `\t--icon-content: "${iconContent}";`, '}'].join('\n')

const generatedIconFontEmojiSequencesName = (fontTypeName: string): string =>
	`${fontTypeName
		.replace(/^[A-Z]+(?=[A-Z][a-z])/, prefix => prefix.toLowerCase())
		.replace(/^./, firstChar => firstChar.toLowerCase())}EmojiSequences`

export const generatedIconFontTypescript = (
	fontTypeName: string,
	iconUnicodeSequences: IconUnicodeSequences,
): string => {
	const emojiSequencesName = generatedIconFontEmojiSequencesName(fontTypeName)

	return [
		`export const ${emojiSequencesName} = ${JSON.stringify(iconUnicodeSequences)} as const`,
		'',
		`/** Icon ID for ${fontTypeName}. */`,
		`export type ${fontTypeName}ID = keyof typeof ${emojiSequencesName}`,
		'',
	].join('\n')
}

const sfntChecksumAdjustment = 0xb1b0afba
const postCustomGlyphNameStart = 258

type SfntTable = {
	tag: string
	checksum: number
	offset: number
	length: number
	data: Buffer
}

type VariationSequenceMapping = {
	baseCodepoint: number
	glyphId: number
	variationSelector: number
}

const align4 = (value: number): number => (value + 3) & ~3

const checksumForTable = (table: Buffer): number => {
	let checksum = 0
	const paddedTable = Buffer.alloc(align4(table.length))

	table.copy(paddedTable)

	for (let offset = 0; offset < paddedTable.length; offset += 4) {
		checksum = (checksum + paddedTable.readUInt32BE(offset)) >>> 0
	}

	return checksum
}

const parseSfntTables = (fontBuffer: Buffer): SfntTable[] => {
	const tableCount = fontBuffer.readUInt16BE(4)
	const tables: SfntTable[] = []

	for (let index = 0; index < tableCount; index++) {
		const recordOffset = 12 + index * 16
		const tag = fontBuffer.toString('ascii', recordOffset, recordOffset + 4)
		const offset = fontBuffer.readUInt32BE(recordOffset + 8)
		const length = fontBuffer.readUInt32BE(recordOffset + 12)

		tables.push({
			tag,
			checksum: fontBuffer.readUInt32BE(recordOffset + 4),
			offset,
			length,
			data: fontBuffer.subarray(offset, offset + length),
		})
	}

	return tables
}

const pascalStrings = (buffer: Buffer, offset: number, count: number): string[] => {
	const strings: string[] = []
	let stringOffset = offset

	while (stringOffset < buffer.length && strings.length < count) {
		const length = buffer.readUInt8(stringOffset)
		const start = stringOffset + 1
		const end = start + length

		if (end > buffer.length) {
			break
		}

		strings.push(buffer.toString('ascii', start, end))
		stringOffset = end
	}

	return strings
}

const glyphIdByName = (fontBuffer: Buffer): Map<string, number> => {
	const tables = parseSfntTables(fontBuffer)
	const post = tables.find(table => table.tag === 'post')
	const maxp = tables.find(table => table.tag === 'maxp')

	if (post === undefined || maxp === undefined) {
		throw new Error('Cannot map glyph names without post and maxp tables.')
	}

	if (post.data.readUInt32BE(0) !== 0x00020000) {
		throw new Error('Cannot map glyph names unless the post table uses format 2.')
	}

	const glyphCount = maxp.data.readUInt16BE(4)
	const nameIndexes = Array.from({ length: glyphCount }, (_value, glyphId) =>
		post.data.readUInt16BE(34 + glyphId * 2),
	)
	const customNameCount = Math.max(
		0,
		...nameIndexes.map(nameIndex => nameIndex - postCustomGlyphNameStart + 1),
	)
	const customNames = pascalStrings(post.data, 34 + glyphCount * 2, customNameCount)
	const result = new Map<string, number>()

	for (const [glyphId, nameIndex] of nameIndexes.entries()) {
		const glyphName =
			nameIndex < postCustomGlyphNameStart
				? undefined
				: customNames[nameIndex - postCustomGlyphNameStart]

		if (glyphName !== undefined && glyphName !== '') {
			result.set(glyphName, glyphId)
		}
	}

	return result
}

// svgtofont maps emoji-presenting strings like "❤️" to the base Unicode codepoint,
// but it does not add the cmap format-14 variation selector table. Browsers need
// that table to pick this font's SVG glyph for U+2764 U+FE0F instead of falling
// through to a platform color emoji font.
const emojiVariationMappings = (
	fontBuffer: Buffer,
	iconUnicodeSequences: IconUnicodeSequences,
): VariationSequenceMapping[] => {
	const glyphIds = glyphIdByName(fontBuffer)

	return Object.entries(iconUnicodeSequences)
		.map(([iconName, iconSequence]): VariationSequenceMapping | null => {
			const codepoints = [...iconSequence].map(codepoint => codepoint.codePointAt(0))

			if (codepoints.length !== 2 || codepoints[0] === undefined || codepoints[1] !== 0xfe0f) {
				return null
			}

			const glyphId = glyphIds.get(iconName)

			if (glyphId === undefined) {
				throw new Error(`Cannot find glyph named ${iconName} for emoji variation mapping.`)
			}

			return {
				baseCodepoint: codepoints[0],
				glyphId,
				variationSelector: codepoints[1],
			}
		})
		.filter((mapping): mapping is VariationSequenceMapping => mapping !== null)
}

const writeUInt24BE = (buffer: Buffer, value: number, offset: number): void => {
	buffer.writeUInt8((value >> 16) & 0xff, offset)
	buffer.writeUInt8((value >> 8) & 0xff, offset + 1)
	buffer.writeUInt8(value & 0xff, offset + 2)
}

// cmap format 14 stores Unicode variation sequence mappings. We only emit
// non-default mappings for base-codepoint + U+FE0F sequences that already have
// named glyphs in the generated font.
const cmapFormat14Table = (mappings: readonly VariationSequenceMapping[]): Buffer => {
	const mappingsBySelector = new Map<number, VariationSequenceMapping[]>()

	for (const mapping of mappings) {
		const selectorMappings = mappingsBySelector.get(mapping.variationSelector) ?? []

		selectorMappings.push(mapping)
		mappingsBySelector.set(mapping.variationSelector, selectorMappings)
	}

	const selectorEntries = [...mappingsBySelector.entries()].sort(
		([selectorA], [selectorB]) => selectorA - selectorB,
	)
	const headerLength = 10 + selectorEntries.length * 11
	const mappingTables = selectorEntries.map(([variationSelector, selectorMappings]) => ({
		variationSelector,
		mappings: selectorMappings
			.slice()
			.sort(
				(mappingA, mappingB) =>
					mappingA.baseCodepoint - mappingB.baseCodepoint || mappingA.glyphId - mappingB.glyphId,
			)
			.map(mapping => ({
				baseCodepoint: mapping.baseCodepoint,
				glyphId: mapping.glyphId,
			})),
	}))
	const length =
		headerLength + mappingTables.reduce((size, table) => size + 4 + table.mappings.length * 5, 0)
	const buffer = Buffer.alloc(length)

	buffer.writeUInt16BE(14, 0)
	buffer.writeUInt32BE(length, 2)
	buffer.writeUInt32BE(mappingTables.length, 6)

	let recordOffset = 10
	let mappingTableOffset = headerLength

	for (const table of mappingTables) {
		writeUInt24BE(buffer, table.variationSelector, recordOffset)
		buffer.writeUInt32BE(0, recordOffset + 3)
		buffer.writeUInt32BE(mappingTableOffset, recordOffset + 7)
		buffer.writeUInt32BE(table.mappings.length, mappingTableOffset)

		let mappingOffset = mappingTableOffset + 4

		for (const mapping of table.mappings) {
			writeUInt24BE(buffer, mapping.baseCodepoint, mappingOffset)
			buffer.writeUInt16BE(mapping.glyphId, mappingOffset + 3)
			mappingOffset += 5
		}

		recordOffset += 11
		mappingTableOffset = mappingOffset
	}

	return buffer
}

const cmapWithVariationSequences = (
	cmap: Buffer,
	mappings: readonly VariationSequenceMapping[],
): Buffer => {
	const subtableCount = cmap.readUInt16BE(2)
	const retainedRecords: { platformId: number; encodingId: number; table: Buffer }[] = []
	const seenOffsets = new Set<number>()

	for (let index = 0; index < subtableCount; index++) {
		const recordOffset = 4 + index * 8
		const platformId = cmap.readUInt16BE(recordOffset)
		const encodingId = cmap.readUInt16BE(recordOffset + 2)
		const subtableOffset = cmap.readUInt32BE(recordOffset + 4)
		const format = cmap.readUInt16BE(subtableOffset)

		if (format === 14) {
			continue
		}

		if (seenOffsets.has(subtableOffset)) {
			continue
		}

		seenOffsets.add(subtableOffset)

		const length =
			format === 12 ? cmap.readUInt32BE(subtableOffset + 4) : cmap.readUInt16BE(subtableOffset + 2)

		retainedRecords.push({
			platformId,
			encodingId,
			table: cmap.subarray(subtableOffset, subtableOffset + length),
		})
	}

	retainedRecords.push({
		platformId: 0,
		encodingId: 5,
		table: cmapFormat14Table(mappings),
	})

	const headerLength = 4 + retainedRecords.length * 8
	const length =
		headerLength + retainedRecords.reduce((size, record) => size + record.table.length, 0)
	const buffer = Buffer.alloc(length)

	buffer.writeUInt16BE(0, 0)
	buffer.writeUInt16BE(retainedRecords.length, 2)

	let subtableOffset = headerLength

	for (const [index, record] of retainedRecords.entries()) {
		const recordOffset = 4 + index * 8

		buffer.writeUInt16BE(record.platformId, recordOffset)
		buffer.writeUInt16BE(record.encodingId, recordOffset + 2)
		buffer.writeUInt32BE(subtableOffset, recordOffset + 4)
		record.table.copy(buffer, subtableOffset)
		subtableOffset += record.table.length
	}

	return buffer
}

// Replace a single SFNT table and recompute table checksums. This is intentionally
// narrow: the only caller patches `cmap` after svgtofont writes the TTF.
const fontWithTable = (fontBuffer: Buffer, tag: string, tableData: Buffer): Buffer => {
	const tables = parseSfntTables(fontBuffer)
	const table = tables.find(entry => entry.tag === tag)

	if (table === undefined) {
		throw new Error(`Cannot replace missing ${tag} table.`)
	}

	table.data = tableData
	table.length = tableData.length
	tables.sort((tableA, tableB) => tableA.tag.localeCompare(tableB.tag))

	const tableCount = tables.length
	const headerLength = 12 + tableCount * 16
	let nextOffset = headerLength

	for (const entry of tables) {
		entry.offset = nextOffset
		entry.length = entry.data.length
		entry.checksum = checksumForTable(entry.data)
		nextOffset += align4(entry.length)
	}

	const output = Buffer.alloc(nextOffset)

	fontBuffer.copy(output, 0, 0, 12)

	for (const [index, entry] of tables.entries()) {
		const recordOffset = 12 + index * 16

		output.write(entry.tag, recordOffset, 4, 'ascii')
		output.writeUInt32BE(entry.checksum, recordOffset + 4)
		output.writeUInt32BE(entry.offset, recordOffset + 8)
		output.writeUInt32BE(entry.length, recordOffset + 12)
		entry.data.copy(output, entry.offset)
	}

	const head = tables.find(entry => entry.tag === 'head')

	if (head === undefined) {
		throw new Error('Cannot set font checksum without a head table.')
	}

	output.writeUInt32BE(0, head.offset + 8)
	output.writeUInt32BE((sfntChecksumAdjustment - checksumForTable(output)) >>> 0, head.offset + 8)

	return output
}

const fontWithEmojiVariationSequences = (
	fontBuffer: Buffer,
	iconUnicodeSequences: IconUnicodeSequences,
): Buffer => {
	const mappings = emojiVariationMappings(fontBuffer, iconUnicodeSequences)

	if (mappings.length === 0) {
		return fontBuffer
	}

	const cmap = parseSfntTables(fontBuffer).find(table => table.tag === 'cmap')

	if (cmap === undefined) {
		throw new Error('Cannot add emoji variation sequences without a cmap table.')
	}

	return fontWithTable(fontBuffer, 'cmap', cmapWithVariationSequences(cmap.data, mappings))
}

export const generatedIconFontCSS = (fontName: string, cssRules: readonly string[]): string => {
	return [
		'[data-icon~="wbicons"] {',
		'\t&::before {',
		'\t\tcontent: var(--icon-content);',
		`\t\tfont-family: var(--fontFamily-${fontName});`,
		'\t\tfont-style: normal;',
		'\t\t-webkit-font-smoothing: antialiased;',
		'\t\t-moz-osx-font-smoothing: grayscale;',
		'\t}',
		'',
		'\t&[data-icon~="emoji"]::before {',
		'\t\tfont-family: var(--fontFamily-emoji);',
		'\t}',
		'',
		cssRules
			.map(cssRule =>
				cssRule
					.split('\n')
					.map(line => `\t${line}`)
					.join('\n'),
			)
			.join('\n\n'),
		'}',
		'',
	].join('\n')
}

export class SVGFont {
	public readonly fontName: string
	public readonly fontTypeName: string
	public readonly svgIconsDir: string
	public readonly fontOutputDir: string
	public readonly cssOutputDir: string
	private readonly currentHash: string
	private readonly svgoConfig: Config
	private readonly iconUnicodeSequences: IconUnicodeSequences | null

	private constructor(
		fontName: string,
		fontTypeName: string,
		svgIconsDir: string,
		fontOutputDir: string,
		cssOutputDir: string,
		svgoConfig: Config,
		currentHash: string,
		iconUnicodeSequences: IconUnicodeSequences | null,
	) {
		this.fontName = fontName
		this.fontTypeName = fontTypeName
		this.svgIconsDir = svgIconsDir
		this.fontOutputDir = fontOutputDir
		this.cssOutputDir = cssOutputDir
		this.svgoConfig = svgoConfig
		this.currentHash = currentHash
		this.iconUnicodeSequences = iconUnicodeSequences
	}

	static async computeHash(
		svgIconsDir: string,
		fontName: string,
		fontTypeName: string,
		svgoConfig: Config,
		iconUnicodeSequences: IconUnicodeSequences | null,
	): Promise<string> {
		const entries = await fs.promises.readdir(svgIconsDir)

		if (entries.length === 0) {
			throw new Error(`SVG icons directory is empty: ${svgIconsDir}`)
		}

		if (entries.length > maxIconFontChars) {
			throw new Error(
				`This class only allows exporting up to ${maxIconFontChars}; bump this limit if necessary to increase.`,
			)
		}

		const svgFiles: string[] = []

		for (const entry of entries) {
			const fullPath = path.join(svgIconsDir, entry)
			const stat = await fs.promises.stat(fullPath)

			if (!stat.isFile()) {
				throw new Error(
					`Found directory or other non-file entry inside ${svgIconsDir} (only .svg files allowed): ${fullPath}`,
				)
			}

			if (!entry.endsWith('.svg')) {
				throw new Error(`Found non-.svg file inside svgIconsDir: ${fullPath}`)
			}

			svgFiles.push(entry)
		}

		svgFiles.sort()

		const hashParts = [
			fontName,
			JSON.stringify(svgoConfig),
			JSON.stringify(svgToFontOptions),
			JSON.stringify(generatedFontFormats),
			iconFontGeneratorVersion,
			JSON.stringify(iconUnicodeSequences),
			generatedIconFontCSS(fontName, [iconFontCSSRuleForIcon('__icon_name__', '__icon_content__')]),
			generatedIconFontTypescript(fontTypeName, {
				__icon_name__: '__icon_content__',
			}),
			String(svgFiles.length),
		]

		for (const file of svgFiles) {
			const contents = await fs.promises.readFile(path.join(svgIconsDir, file), 'utf-8')

			hashParts.push(file, contents)
		}

		const hashInput = hashParts.join('||||')

		return createHash('sha256').update(hashInput).digest('hex')
	}

	public static async create({
		fontName,
		fontTypeName,
		svgIconsDir,
		fontOutputDir,
		cssOutputDir,
		iconUnicodeSequences = null,
	}: {
		fontName: string
		fontTypeName: string
		svgIconsDir: string
		fontOutputDir: string
		cssOutputDir: string
		iconUnicodeSequences?: IconUnicodeSequences | null
	}) {
		const repoRoot = getRepositoryRoot()

		const svgIconsDirAbs = path.join(repoRoot, svgIconsDir)
		const fontOutputDirAbs = path.join(repoRoot, fontOutputDir)
		const cssOutputDirAbs = path.join(repoRoot, cssOutputDir)
		const fontsDir = path.resolve(repoRoot, 'src', 'assets', 'fonts')

		if (!path.resolve(fontOutputDirAbs).startsWith(fontsDir)) {
			throw new Error(
				`fontOutputDir must be a subdirectory of 'src/assets/fonts/' but got: ${fontOutputDirAbs}`,
			)
		}

		const svgoConfig = await loadConfig(path.join(repoRoot, 'tests/utils/svgo.config.mjs'))
		const currentHash = await SVGFont.computeHash(
			svgIconsDirAbs,
			fontName,
			fontTypeName,
			svgoConfig,
			iconUnicodeSequences,
		)

		return new SVGFont(
			fontName,
			fontTypeName,
			svgIconsDirAbs,
			fontOutputDirAbs,
			cssOutputDirAbs,
			svgoConfig,
			currentHash,
			iconUnicodeSequences,
		)
	}

	public async nonMonochromeFiles(): Promise<Record<string, string[]>> {
		const result: Record<string, string[]> = {}
		const entries = await fs.promises.readdir(this.svgIconsDir)

		for (const entry of entries) {
			if (!entry.endsWith('.svg')) {
				throw new Error(`Non-SVG file found: ${entry}`)
			}

			const fullPath = path.join(this.svgIconsDir, entry)
			const svgContent = await fs.promises.readFile(fullPath, 'utf-8')
			const errors = validateSvgIsMonochromeBlack(svgContent)

			if (errors.length > 0) {
				result[entry] = errors
			}
		}

		return result
	}

	public isUpToDate(): boolean {
		const hashFilePath = path.join(this.fontOutputDir, 'font_hash.sha256')

		try {
			if (!fs.existsSync(this.fontOutputDir)) {
				return false
			}

			const storedHash = fs.readFileSync(hashFilePath, 'utf-8').trim()

			return storedHash === this.currentHash
		} catch {
			return false
		}
	}

	public writeCommand(): string {
		const repoRoot = getRepositoryRoot()
		const relSvgIconsDir = path.relative(repoRoot, this.svgIconsDir)
		const relFontOutputDir = path.relative(repoRoot, this.fontOutputDir)
		const relCssOutputDir = path.relative(repoRoot, this.cssOutputDir)

		return `pnpm tsx src/tools/icon-font-generator/icon-font-generator.ts --font-name "${this.fontName}" --font-type-name "${this.fontTypeName}" --svg-icons-dir "${relSvgIconsDir}" --font-output-dir "${relFontOutputDir}" --css-output-dir "${relCssOutputDir}"`
	}

	public async write() {
		await fs.promises.mkdir(this.fontOutputDir, { recursive: true })
		await fs.promises.mkdir(this.cssOutputDir, { recursive: true })

		const { iconUnicodeSequences } = this

		if (iconUnicodeSequences !== null) {
			const repeatedUnicodeSequences = repeatedIconFontUnicodeSequences(iconUnicodeSequences)

			if (Object.keys(repeatedUnicodeSequences).length > 0) {
				throw new Error(
					`Duplicate unicode mappings for ${this.fontName}: ${JSON.stringify(repeatedUnicodeSequences)}`,
				)
			}
		}

		const result = await svgtofont({
			src: this.svgIconsDir,
			dist: this.fontOutputDir,
			fontName: this.fontName,
			excludeFormat: ['symbol.svg'],
			css: false,
			...svgToFontOptions,
			getIconUnicode: (name, unicode, startUnicode) => {
				return [iconUnicodeSequences?.[name] ?? unicode, startUnicode]
			},
		})

		if (iconUnicodeSequences !== null) {
			const ttfPath = path.join(this.fontOutputDir, `${this.fontName}.ttf`)
			const patchedTtf = fontWithEmojiVariationSequences(
				await fs.promises.readFile(ttfPath),
				iconUnicodeSequences,
			)

			await fs.promises.writeFile(ttfPath, patchedTtf)
			await fs.promises.writeFile(
				path.join(this.fontOutputDir, `${this.fontName}.eot`),
				Buffer.from(ttf2eot(patchedTtf)),
			)
			await fs.promises.writeFile(
				path.join(this.fontOutputDir, `${this.fontName}.woff`),
				Buffer.from(ttf2woff(patchedTtf)),
			)
			await fs.promises.writeFile(
				path.join(this.fontOutputDir, `${this.fontName}.woff2`),
				Buffer.from(ttf2woff2(patchedTtf)),
			)
		}

		const cssRules: string[] = []
		const generatedIconUnicodeSequences: Record<string, string> = {}

		for (const [key, icon] of Object.entries(result).sort(([keyA, _valA], [keyB, _valB]) =>
			keyA.localeCompare(keyB),
		)) {
			if (icon.encodedCode === undefined || typeof icon.encodedCode !== 'string') {
				throw new Error(`Key ${key} not encoded: ${JSON.stringify(icon)}`)
			}

			const iconUnicodeSequence = iconUnicodeSequences?.[key]

			if (iconUnicodeSequences !== null && iconUnicodeSequence === undefined) {
				throw new Error(`Missing emoji unicode mapping for ${this.fontName} icon: ${key}`)
			}

			cssRules.push(iconFontCSSRuleForIcon(key, iconUnicodeSequence ?? icon.encodedCode))
			generatedIconUnicodeSequences[key] = iconUnicodeSequence ?? icon.encodedCode
		}
		const generatedCSS = generatedIconFontCSS(this.fontName, cssRules)

		await fs.promises.writeFile(path.join(this.cssOutputDir, `${this.fontName}.css`), generatedCSS)

		for (const generatedSVGPath of [path.join(this.fontOutputDir, `${this.fontName}.svg`)]) {
			const optimizedSVG = optimize(
				(await fs.promises.readFile(generatedSVGPath)).toString('utf-8'),
				{
					path: generatedSVGPath,
					...this.svgoConfig,
				},
			).data

			await fs.promises.writeFile(generatedSVGPath, optimizedSVG)
		}
		let typescriptContent = generatedIconFontTypescript(
			this.fontTypeName,
			generatedIconUnicodeSequences,
		)
		const typescriptPath = path.join(this.cssOutputDir, `${this.fontName}.ts`)
		const prettierConfig = await prettier.resolveConfig(typescriptPath)

		typescriptContent = await prettier.format(typescriptContent, {
			...prettierConfig,
			parser: 'typescript',
		})
		await fs.promises.writeFile(typescriptPath, typescriptContent)
		await fs.promises.writeFile(
			path.join(this.fontOutputDir, 'font_hash.sha256'),
			this.currentHash + '\n',
		)
	}
}
