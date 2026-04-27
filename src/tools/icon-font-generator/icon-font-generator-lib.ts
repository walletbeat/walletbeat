import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import path from 'node:path'

import { type Config, loadConfig, optimize } from 'svgo'
import svgtofont from 'svgtofont'

import { getRepositoryRoot } from '@/tests/utils/codebase'

export const iconFontStartCharCode = 0xea01
export const maxIconFontChars = 255

export class SVGFont {
	public readonly fontName: string
	public readonly svgIconsDir: string
	public readonly fontOutputDir: string
	public readonly cssOutputDir: string
	private readonly currentHash: string
	private readonly svgoConfig: Config

	private constructor(
		fontName: string,
		svgIconsDir: string,
		fontOutputDir: string,
		cssOutputDir: string,
		svgoConfig: Config,
		currentHash: string,
	) {
		this.fontName = fontName
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
		svgIconsDir,
		fontOutputDir,
		cssOutputDir,
	}: {
		fontName: string
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
			svgIconsDirAbs,
			fontOutputDirAbs,
			cssOutputDirAbs,
			svgoConfig,
			currentHash,
		)
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

		return `pnpm tsx src/tools/icon-font-generator/icon-font-generator.ts --font-name "${this.fontName}" --svg-icons-dir "${relSvgIconsDir}" --font-output-dir "${relFontOutputDir}" --css-output-dir "${relCssOutputDir}"`
	}

	public async write() {
		const repoRoot = getRepositoryRoot()
		const publicDir = path.resolve(repoRoot, 'public')

		await fs.promises.mkdir(this.fontOutputDir, { recursive: true })
		await fs.promises.mkdir(this.cssOutputDir, { recursive: true })

		// Compute cssPath relative to repoRoot/public
		const cssPath = path.relative(publicDir, this.cssOutputDir)

		await svgtofont({
			src: this.svgIconsDir,
			dist: this.fontOutputDir,
			fontName: this.fontName,
			excludeFormat: ['symbol.svg'],
			css: {
				output: this.cssOutputDir,
				hasTimestamp: false,
				cssPath: cssPath || '.',
				include: /\.css$/,
			},
			startUnicode: iconFontStartCharCode,
			svgicons2svgfont: {
				fontHeight: 1000,
				normalize: true,
			},
		})

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
		await fs.promises.writeFile(
			path.join(this.fontOutputDir, 'font_hash.sha256'),
			this.currentHash + '\n',
		)
	}
}
