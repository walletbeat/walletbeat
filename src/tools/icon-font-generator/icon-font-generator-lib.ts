import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import path from 'node:path'

import * as prettier from 'prettier'
import { type Config, loadConfig, optimize } from 'svgo'
import svgtofont from 'svgtofont'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { trimWhitespacePrefix } from '@/types/utils/text'

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

export const iconFontStartCharCode = 0xea01
export const maxIconFontChars = 255

export class SVGFont {
	public readonly fontName: string
	public readonly fontTypeName: string
	public readonly svgIconsDir: string
	public readonly fontOutputDir: string
	public readonly cssOutputDir: string
	private readonly currentHash: string
	private readonly svgoConfig: Config

	private constructor(
		fontName: string,
		fontTypeName: string,
		svgIconsDir: string,
		fontOutputDir: string,
		cssOutputDir: string,
		svgoConfig: Config,
		currentHash: string,
	) {
		this.fontName = fontName
		this.fontTypeName = fontTypeName
		this.svgIconsDir = svgIconsDir
		this.fontOutputDir = fontOutputDir
		this.cssOutputDir = cssOutputDir
		this.svgoConfig = svgoConfig
		this.currentHash = currentHash
	}

	static async computeHash(
		svgIconsDir: string,
		fontName: string,
		svgoConfig: Config,
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

		const hashParts = [fontName, JSON.stringify(svgoConfig), String(svgFiles.length)]

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
	}: {
		fontName: string
		fontTypeName: string
		svgIconsDir: string
		fontOutputDir: string
		cssOutputDir: string
	}) {
		const repoRoot = getRepositoryRoot()

		const svgIconsDirAbs = path.join(repoRoot, svgIconsDir)
		const fontOutputDirAbs = path.join(repoRoot, fontOutputDir)
		const cssOutputDirAbs = path.join(repoRoot, cssOutputDir)
		const publicDir = path.resolve(repoRoot, 'public')

		if (!path.resolve(fontOutputDirAbs).startsWith(publicDir)) {
			throw new Error(
				`fontOutputDir must be a subdirectory of 'public/' but got: ${fontOutputDirAbs}`,
			)
		}

		const svgoConfig = await loadConfig(path.join(repoRoot, 'tests/utils/svgo.config.mjs'))
		const currentHash = await SVGFont.computeHash(svgIconsDirAbs, fontName, svgoConfig)

		return new SVGFont(
			fontName,
			fontTypeName,
			svgIconsDirAbs,
			fontOutputDirAbs,
			cssOutputDirAbs,
			svgoConfig,
			currentHash,
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
		const repoRoot = getRepositoryRoot()
		const publicDir = path.resolve(repoRoot, 'public')

		await fs.promises.mkdir(this.fontOutputDir, { recursive: true })
		await fs.promises.mkdir(this.cssOutputDir, { recursive: true })

		// Compute cssPath relative to repoRoot/public
		let cssPath = '/' + path.relative(publicDir, this.fontOutputDir)

		if (!cssPath.endsWith('/')) {
			cssPath += '/'
		}

		const result = await svgtofont({
			src: this.svgIconsDir,
			dist: this.fontOutputDir,
			fontName: this.fontName,
			excludeFormat: ['symbol.svg'],
			css: false,
			startUnicode: iconFontStartCharCode,
			svgicons2svgfont: {
				fontHeight: 1000,
				normalize: true,
			},
		})

		const cssRules: string[] = []
		const typeValues: string[] = []

		for (const [key, icon] of Object.entries(result).sort(([keyA, _valA], [keyB, _valB]) =>
			keyA.localeCompare(keyB),
		)) {
			if (icon.encodedCode === undefined || typeof icon.encodedCode !== 'string') {
				throw new Error(`Key ${key} not encoded: ${JSON.stringify(icon)}`)
			}

			cssRules.push(`
				&[data-icon~="${key}"] {
					--icon-content: "${icon.encodedCode}";
				},`)
			typeValues.push(`\t| ${JSON.stringify(key)}`)
		}
		const singularFontName = this.fontName.endsWith('s')
			? this.fontName.substring(0, this.fontName.length - 1)
			: this.fontName
		const generatedCSS =
			trimWhitespacePrefix(`
			@font-face {
				font-family: "${this.fontName}";
				src: url('${cssPath}${this.fontName}.eot'); /* IE9*/
				src: url('${cssPath}${this.fontName}.eot?#iefix') format('embedded-opentype') /* IE6-IE8 */,
				url('${cssPath}${this.fontName}.woff2') format('woff2'),
				url('${cssPath}${this.fontName}.woff') format('woff'),
				url('${cssPath}${this.fontName}.ttf') format('truetype'),
				url('${cssPath}${this.fontName}.svg') format('svg');
			}

			[data-${singularFontName}] {
				font-family: 'wbicons';
				font-style: normal;
				-webkit-font-smoothing: antialiased;
				-moz-osx-font-smoothing: grayscale;

				&::before {
					content: var(--icon-content);
				}
				${cssRules.join('\n')}
			}
		`)
				.split('\n')
				.map(line => (line.trim() === '' ? '' : line))
				.join('\n') + '\n'

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
		let dtsContent = [
			`/** Icon ID for the ${this.fontName} font. */`,
			`export type ${this.fontTypeName}FontID =`,
			...typeValues,
		].join('\n')
		const dtsPath = path.join(this.cssOutputDir, `${this.fontName}.d.ts`)
		const prettierConfig = await prettier.resolveConfig(dtsPath)

		dtsContent = await prettier.format(dtsContent, { ...prettierConfig, parser: 'typescript' })
		await fs.promises.writeFile(dtsPath, dtsContent)
		await fs.promises.writeFile(
			path.join(this.fontOutputDir, 'font_hash.sha256'),
			this.currentHash + '\n',
		)
	}
}
