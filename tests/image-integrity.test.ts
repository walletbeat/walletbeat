import { execFile } from 'node:child_process'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

import { format, resolveConfig } from 'prettier'
import sharp from 'sharp'
import { type Config, loadConfig, optimize } from 'svgo'
import { describe, expect, it } from 'vitest'

import { decodeIcoImage, type IcoImage, parseIco } from '@/tools/image-integrity/ico-lib'
import {
	detectImageFormat,
	FORMAT_FOR_EXTENSION,
	isImageExtension,
	RASTER_EXTENSIONS,
} from '@/tools/image-integrity/image-integrity-lib'
import { detectBlockyJpeg } from '@/tools/image-integrity/jpeg-detector-lib'
import {
	CodebaseEntryType,
	crawlCodebase,
	getRepositoryRoot,
	GitIgnoredFiles,
} from '@/utils/codebase'
import { isSameJson } from '@/utils/json'

/**
 * Path to the JSON whitelist of image files already verified as passing every
 * integrity test that applies to them.
 *
 * This file is self-maintaining: the repository scan below adds newly-added
 * clean images, refreshes the hash and recorded test set of changed images,
 * and prunes entries for images that no longer exist, then writes the updated
 * whitelist back to disk. A human never needs to edit it by hand — just run
 * the test after adding or removing an image and commit the resulting JSON
 * change alongside the image.
 */
const WHITELIST_PATH = path.join(
	getRepositoryRoot(),
	'tests',
	'image-integrity',
	'verified-clean-images.json',
)

/**
 * A single entry in the verified-clean whitelist: the file's sha256 plus the
 * names of every integrity test that has been confirmed to pass for it.
 *
 * Storing the passed-test set means that adding a NEW integrity test
 * invalidates existing whitelist entries that have not yet been evaluated
 * against it, forcing them to be re-checked on the next run.
 */
interface CleanImageEntry {
	hash: string
	passedTests: string[]
}

/**
 * Files that are explicitly allowed to be low-quality/blocky JPEGs.
 *
 * This is a MANUAL whitelist. An image in
 * this set is acknowledged as intentionally low-quality (e.g. an old marketing
 * asset that is not worth re-encoding), so the blockiness test does not apply
 * to it. It must be updated by hand when a new intentionally-low-quality image
 * is added.
 *
 * Seeded with the images currently in the repository whose baked-in JPEG
 * artifacts exceed the blockiness threshold and that cannot be improved by
 * re-encoding.
 */
const BLOCKY_ALLOWED_FILES: Set<string> = new Set([
	'resources/files/social-media/threads/2026-07-14 - Clear signing update/walletbeat_slide.jpg',
	'public/images/entities/firefly.jpg',
	'public/images/wallets/firefly.jpg',
	'resources/branding/x_dot_com_profile.400px.jpg',
	'public/hero.jpg',
])

/** A single image file discovered by the crawler. */
interface ImageFileEntry {
	filePath: string
	raw: Buffer
	contents: string
}

/** Result of running one integrity test against an image. */
interface ImageTestResult {
	pass: boolean
	/** Blockiness score (blockiness test only). */
	score?: number
	/** Human-readable reason when the test fails. */
	detail?: string
}

/** An integrity test: a named check that applies to a subset of images. */
interface ImageTest {
	name: string
	/** Whether this test applies to the given image. */
	appliesTo(entry: ImageFileEntry): boolean
	/** Run the test against the image. */
	run(entry: ImageFileEntry): Promise<ImageTestResult> | ImageTestResult
	/** Whether this test requires the `inkscape` CLI. */
	requiresInkscape: boolean
}

/** Extension of a path, lowercased ('' if none). */
function extensionOf(filePath: string): string {
	const dot = filePath.lastIndexOf('.')

	return dot === -1 ? '' : filePath.slice(dot).toLowerCase()
}

/** Extract raster images embedded in an SVG as base64 data URIs. */
function extractEmbeddedRasters(svgContents: string): { mime: string; buffer: Buffer }[] {
	const result: { mime: string; buffer: Buffer }[] = []
	const dataUriRegex = /data:\s*image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)/g
	let match: RegExpExecArray | null

	while ((match = dataUriRegex.exec(svgContents)) !== null) {
		result.push({
			mime: match[1],
			buffer: Buffer.from(match[2], 'base64'),
		})
	}

	return result
}

/**
 * Detect residual low-quality JPEG blockiness. Applies to every raster image
 * (PNG/JPEG/GIF/WebP/ICO) and to any SVG that embeds a raster image.
 */
const BLOCKINESS_TEST: ImageTest = {
	name: 'blockiness',
	requiresInkscape: false,
	appliesTo: entry => {
		if (BLOCKY_ALLOWED_FILES.has(entry.filePath)) {
			return false
		}

		const ext = extensionOf(entry.filePath)

		if (RASTER_EXTENSIONS.has(ext)) {
			return true
		}

		return ext === '.svg' && extractEmbeddedRasters(entry.contents).length > 0
	},
	run: async entry => {
		if (extensionOf(entry.filePath) === '.svg') {
			const rasters = extractEmbeddedRasters(entry.contents)

			if (rasters.length === 0) {
				return { pass: true }
			}

			let worst = 0

			for (const raster of rasters) {
				const result = await detectBlockyJpeg(raster.buffer)

				worst = Math.max(worst, result.score)

				if (result.isTooBlocky) {
					return {
						pass: false,
						score: result.score,
						detail: `embedded ${raster.mime} image`,
					}
				}
			}

			return { pass: true, score: worst }
		}

		const result = await detectBlockyJpeg(entry.raw)

		return {
			pass: !result.isTooBlocky,
			score: result.score,
		}
	},
}

/**
 * SVGs excluded from the optimization check.
 *
 * These are auto-generated (treasury charts refreshed on each transaction, and
 * the icon-font SVGs emitted by the generator), so re-checking them on every
 * run would be wasteful and noisy. The wbicons source SVGs are also excluded
 * because they are optimized at font generation time.
 */
const SVG_OPTIMIZATION_EXCLUDED: Set<string> = new Set([
	'governance/treasury/treasury-expenses-over-time.svg',
	'governance/treasury/treasury-expenses-breakdown.svg',
])

/** Paths under which every SVG is excluded from the optimization check. */
const SVG_OPTIMIZATION_EXCLUDED_PREFIXES: string[] = [
	'src/assets/fonts/',
	'resources/files/wbicons/',
]

/** Whether a file path is excluded from the SVG optimization check. */
function isSvgOptimizationExcluded(filePath: string): boolean {
	if (SVG_OPTIMIZATION_EXCLUDED.has(filePath)) {
		return true
	}

	return SVG_OPTIMIZATION_EXCLUDED_PREFIXES.some(prefix => filePath.startsWith(prefix))
}

/** Lazily-loaded and cached SVGO config. */
let svgoConfigPromise: Promise<Config> | undefined

function getSvgoConfig(): Promise<Config> {
	if (svgoConfigPromise === undefined) {
		const configPath = path.join(getRepositoryRoot(), 'svgo.config.mjs')

		svgoConfigPromise = loadConfig(configPath)
	}

	return svgoConfigPromise
}

/**
 * Detect SVGs that are not fully optimized (SVGO can still reduce their size).
 * Applies to every SVG except the auto-generated ones above.
 */
const SVG_OPTIMIZED_TEST: ImageTest = {
	name: 'svg-optimized',
	requiresInkscape: false,
	appliesTo: entry =>
		extensionOf(entry.filePath) === '.svg' && !isSvgOptimizationExcluded(entry.filePath),
	run: async entry => {
		const svgoConfig = await getSvgoConfig()
		const result = optimize(entry.contents, {
			path: entry.filePath,
			...svgoConfig,
		})

		const originalSize = entry.contents.length
		const optimizedSize = result.data.length

		if (optimizedSize < originalSize) {
			return {
				pass: false,
				detail: `${originalSize} -> ${optimizedSize} bytes (${originalSize - optimizedSize} can be saved)`,
			}
		}

		return { pass: true }
	},
}

/**
 * Threshold: if the raw text of embedded data: URIs compose more than this
 * fraction of the SVG file size, the file is flagged as a disguised raster
 * image (PNG/JPEG/WebP inside an SVG wrapper) rather than real vector data.
 */
const EMBEDDED_IMAGE_RATIO_THRESHOLD = 0.95

/**
 * SVGs excluded from the SVG vector check.
 */
const SVG_VECTOR_EXCLUDED: Set<string> = new Set([
	'governance/treasury/treasury-expenses-over-time.svg',
	'governance/treasury/treasury-expenses-breakdown.svg',
])

/** Paths under which every SVG is excluded from the vector check (auto-generated font SVGs). */
const SVG_VECTOR_EXCLUDED_PREFIXES: string[] = ['src/assets/fonts/']

/** Whether a file path is excluded from the SVG vector check. */
function isSvgVectorExcluded(filePath: string): boolean {
	if (SVG_VECTOR_EXCLUDED.has(filePath)) {
		return true
	}

	return SVG_VECTOR_EXCLUDED_PREFIXES.some(prefix => filePath.startsWith(prefix))
}
/**
 * Detect SVGs that are disguised raster images (mostly an embedded base64
 * data URI rather than genuine vector content). Applies to every SVG.
 */
const SVG_VECTOR_TEST: ImageTest = {
	name: 'svg-vector',
	requiresInkscape: false,
	appliesTo: entry =>
		extensionOf(entry.filePath) === '.svg' && !isSvgVectorExcluded(entry.filePath),
	run: entry => {
		const fileSize = entry.raw.byteLength
		const dataUriRegex = /data:\s*([\w/.+-]+);[^,]*,([^"'>\s]+)/g
		let match: RegExpExecArray | null
		let embeddedSize = 0
		let mimeType = ''

		while ((match = dataUriRegex.exec(entry.contents)) !== null) {
			mimeType = match[1]
			embeddedSize += match[0].length
		}

		if (embeddedSize === 0) {
			return { pass: true }
		}

		const ratio = embeddedSize / fileSize

		if (ratio > EMBEDDED_IMAGE_RATIO_THRESHOLD) {
			return {
				pass: false,
				detail: `${(ratio * 100).toFixed(1)}% embedded ${mimeType} data (${embeddedSize} of ${fileSize} bytes)`,
			}
		}

		return { pass: true }
	},
}

/** Parsed `viewBox` attribute. */
interface ViewBox {
	x: number
	y: number
	width: number
	height: number
}

/** Which of the four rasterized borders the drawn content reaches. */
interface TouchingBorders {
	left: boolean
	right: boolean
	top: boolean
	bottom: boolean
}

const execFileAsync = promisify(execFile)

/** Whether the inkscape-dependent tests should run. */
let inkscapeTestsEnabled = false

/**
 * Check whether the `inkscape` CLI is available on PATH.
 */
async function isInkscapeAvailable(): Promise<boolean> {
	try {
		await execFileAsync('inkscape', ['--version'])

		return true
	} catch {
		return false
	}
}

/** Parse the `viewBox` attribute of an SVG (null when absent/malformed). */
function parseViewBox(contents: string): ViewBox | null {
	const match = contents.match(/viewBox\s*=\s*"([^"]+)"/)

	if (match === null) {
		return null
	}

	const parts = match[1]
		.trim()
		.split(/[\s,]+/)
		.map(Number)

	if (parts.length !== 4 || parts.some(Number.isNaN)) {
		return null
	}

	return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
}

/**
 * Rasterize an SVG to a 2048×2048 PNG using the `inkscape` CLI, returning the
 * raw PNG bytes.
 */
async function rasterizeSvgWithInkscape(svgPath: string): Promise<Buffer> {
	const outPath = path.join(os.tmpdir(), `wbicon-${crypto.randomUUID()}.png`)
	const args = [
		'--export-type=png',
		'--export-width=2048',
		'--export-height=2048',
		`--export-filename=${outPath}`,
		svgPath,
	]

	// inkscape can transiently fail to connect to the session D-Bus bus on
	// startup (Gio::DBus::Error) even when the bus is present; retry a couple of
	// times to make the rasterization deterministic.
	let lastError: unknown

	try {
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await execFileAsync('inkscape', args, { timeout: 60000 })

				return fs.readFile(outPath)
			} catch (error) {
				lastError = error
			}
		}

		throw lastError
	} finally {
		// Always clean up the temporary PNG, whether rasterization succeeded or
		// not. Ignore a missing file (e.g. inkscape never produced one).
		try {
			await fs.unlink(outPath)
		} catch {
			// Ignore: the file may not exist.
		}
	}
}

/** Detect which borders of a 2048×2048 rasterized icon the content touches. */
async function detectTouchingBorders(pngBuffer: Buffer): Promise<TouchingBorders> {
	const { data, info } = await sharp(pngBuffer)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const { width, height, channels } = info
	const alphaIndex = 3
	const alphaAt = (x: number, y: number): number => data[(y * width + x) * channels + alphaIndex]

	let left = false
	let right = false
	let top = false
	let bottom = false

	for (let x = 0; x < width; x++) {
		if (alphaAt(x, 0) > 0) {
			top = true
			break
		}
	}

	for (let x = 0; x < width; x++) {
		if (alphaAt(x, height - 1) > 0) {
			bottom = true
			break
		}
	}

	for (let y = 0; y < height; y++) {
		if (alphaAt(0, y) > 0) {
			left = true
			break
		}
	}

	for (let y = 0; y < height; y++) {
		if (alphaAt(width - 1, y) > 0) {
			right = true
			break
		}
	}

	return { left, right, top, bottom }
}

/** Path prefix under which SVGs are expected to be square icon glyphs. */
const WBICON_PREFIX = 'resources/files/wbicons/'

/**
 * Verify that the wbicons source SVGs are square (1:1) icon glyphs whose drawn
 * content touches either the left and right borders or the top and bottom
 * borders (or all four) when rasterized at 2048×2048, so they render as square
 * icons that fill their frame.
 */
const WBICON_SQUARE_TEST: ImageTest = {
	name: 'wbicon-square',
	requiresInkscape: true,
	appliesTo: entry =>
		extensionOf(entry.filePath) === '.svg' && entry.filePath.startsWith(WBICON_PREFIX),
	run: async entry => {
		const viewBox = parseViewBox(entry.contents)

		if (viewBox === null) {
			return { pass: false, detail: 'missing or malformed viewBox attribute' }
		}

		const ratio = viewBox.width / viewBox.height

		if (Math.abs(ratio - 1) > 1e-6) {
			return {
				pass: false,
				detail: `viewBox is ${viewBox.width}×${viewBox.height} (aspect ratio ${ratio.toFixed(4)}, not 1:1)`,
			}
		}

		const png = await rasterizeSvgWithInkscape(path.join(getRepositoryRoot(), entry.filePath))
		const borders = await detectTouchingBorders(png)
		const count = [borders.left, borders.right, borders.top, borders.bottom].filter(Boolean).length
		const opposing = (borders.left && borders.right) || (borders.top && borders.bottom)

		if ((count === 2 && opposing) || count === 4) {
			return { pass: true }
		}

		const sides = (['left', 'right', 'top', 'bottom'] as const)
			.filter(side => borders[side])
			.join(', ')

		return {
			pass: false,
			detail: `content touches ${count} border(s): ${sides} (must touch exactly 2 opposing borders or all 4)`,
		}
	},
}

/** Extract a human-readable message from a thrown value. */
function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/**
 * Detect the format of every embedded image inside an ICO container (PNG or
 * uncompressed BMP), validating that each is a decodable, well-formed image.
 */
async function validateIcoFrames(entry: ImageFileEntry): Promise<ImageTestResult> {
	let frames: IcoImage[]

	try {
		frames = parseIco(entry.raw)
	} catch (error) {
		return { pass: false, detail: `invalid ICO container: ${errorMessage(error)}` }
	}

	for (const frame of frames) {
		try {
			await decodeIcoImage(frame)
		} catch (error) {
			return {
				pass: false,
				detail: `embedded ${frame.format} image ${frame.width}x${frame.height} is invalid: ${errorMessage(error)}`,
			}
		}
	}

	return { pass: true }
}

/**
 * Verify that each image is the format its file extension claims (a `.png` is
 * a PNG, a `.jpg` is a JPEG, an `.svg` is an SVG, and so on), and that ICO
 * containers hold valid, decodable embedded images.
 */
const FILE_FORMAT_TEST: ImageTest = {
	name: 'file-format',
	requiresInkscape: false,
	appliesTo: entry => isImageExtension(extensionOf(entry.filePath)),
	run: async entry => {
		const ext = extensionOf(entry.filePath)
		const actual = detectImageFormat(entry.raw)
		const expected = FORMAT_FOR_EXTENSION[ext]

		if (actual !== expected) {
			return {
				pass: false,
				detail: `magic bytes indicate ${actual ?? 'an unknown'} format, expected ${expected}`,
			}
		}

		if (ext === '.ico') {
			return validateIcoFrames(entry)
		}

		return { pass: true }
	},
}

/** All integrity tests, in the order they should be reported. */
const IMAGE_TESTS: ImageTest[] = [
	BLOCKINESS_TEST,
	FILE_FORMAT_TEST,
	SVG_OPTIMIZED_TEST,
	SVG_VECTOR_TEST,
	WBICON_SQUARE_TEST,
]

/** A recorded failure of a specific test for a specific image. */
interface ImageFailure {
	filePath: string
	test: string
	score?: number
	detail?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCleanImageEntry(value: unknown): value is CleanImageEntry {
	if (!isRecord(value)) {
		return false
	}

	return (
		typeof value.hash === 'string' &&
		Array.isArray(value.passedTests) &&
		value.passedTests.every(item => typeof item === 'string')
	)
}

/**
 * Whether an existing cached whitelist entry is valid for the given tests: it
 * exists, matches the image's current hash, and every named test has already
 * passed for it.
 */
function hasValidCachedEntry(
	existing: CleanImageEntry | undefined,
	hash: string,
	testNames: string[],
): boolean {
	return (
		existing !== undefined &&
		existing.hash === hash &&
		testNames.every(testName => existing.passedTests.includes(testName))
	)
}

/** Parse and validate the whitelist JSON. */
function parseCleanImageHashes(contents: string): Record<string, CleanImageEntry> {
	let parsed: unknown

	try {
		parsed = JSON.parse(contents)
	} catch (error) {
		throw new Error(`Invalid whitelist JSON: ${String(error)}`, { cause: error })
	}

	if (!isRecord(parsed)) {
		throw new Error('Invalid whitelist JSON: expected an object')
	}

	const result: Record<string, CleanImageEntry> = {}

	for (const key of Object.keys(parsed)) {
		const value = parsed[key]

		if (!isCleanImageEntry(value)) {
			throw new Error(`Invalid whitelist entry for "${key}"`)
		}

		result[key] = value
	}

	return result
}

/** Load the whitelist from disk (empty when absent). */
async function loadCleanImageHashes(): Promise<Record<string, CleanImageEntry>> {
	let contents: string

	try {
		contents = await fs.readFile(WHITELIST_PATH, 'utf8')
	} catch {
		return {}
	}

	if (contents.trim() === '') {
		return {}
	}

	return parseCleanImageHashes(contents)
}

/**
 * Serialize the whitelist as prettier-compliant JSON, with sorted keys.
 */
async function serializeCleanImageHashes(
	whitelist: Record<string, CleanImageEntry>,
): Promise<string> {
	const sorted: Record<string, CleanImageEntry> = {}

	for (const key of Object.keys(whitelist).sort()) {
		sorted[key] = whitelist[key]
	}

	const prettierConfig = await resolveConfig(WHITELIST_PATH)

	return format(JSON.stringify(sorted, null, '\t') + '\n', {
		...prettierConfig,
		parser: 'json',
	})
}

/**
 * Persist the whitelist to disk, atomically, with sorted keys.
 */
async function saveCleanImageHashes(whitelist: Record<string, CleanImageEntry>): Promise<void> {
	const json = await serializeCleanImageHashes(whitelist)

	let current: string

	try {
		current = await fs.readFile(WHITELIST_PATH, 'utf8')
	} catch {
		current = ''
	}

	if (current !== '' && isSameJson(current, json)) {
		return
	}

	const tmpPath = `${WHITELIST_PATH}.tmp`

	await fs.writeFile(tmpPath, json, 'utf8')
	await fs.rename(tmpPath, WHITELIST_PATH)
}

/** Generate a photo-like raw RGB image used as the basis for JPEG-derived fixtures. */
function makePhotoLikeRaw(width: number, height: number, channels: number, seed: number): Buffer {
	const raw = Buffer.alloc(width * height * channels)
	let state = seed

	const random = (): number => {
		state = (state * 1103515245 + 12345) & 0x7fffffff

		return state / 0x7fffffff
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const offset = (y * width + x) * channels
			const gradient = 120 + 60 * Math.sin(x / 9) * Math.cos(y / 11) + 30 * Math.sin((x + y) / 23)
			const texture = 18 * Math.sin(x / 3.1) * Math.sin(y / 2.7) + 12 * (random() - 0.5)

			raw[offset] = Math.max(0, Math.min(255, gradient + texture + 10 * random()))
			raw[offset + 1] = Math.max(0, Math.min(255, gradient * 0.9 + texture + 8 * random()))
			raw[offset + 2] = Math.max(0, Math.min(255, 140 + 50 * Math.cos(y / 13) + texture * 0.8))
		}
	}

	return raw
}

/** Build a PNG that was genuinely re-encoded from a low-quality JPEG. */
async function generateJpegDerivedPng(): Promise<Buffer> {
	const raw = makePhotoLikeRaw(256, 256, 3, 42)
	const jpeg = await sharp(raw, { raw: { width: 256, height: 256, channels: 3 } })
		.jpeg({ quality: 20 })
		.toBuffer()

	return sharp(jpeg).png().toBuffer()
}

/** Build a genuine lossless PNG (same content, never JPEG-compressed). */
async function generateGenuinePng(): Promise<Buffer> {
	const raw = makePhotoLikeRaw(256, 256, 3, 42)

	return sharp(raw, { raw: { width: 256, height: 256, channels: 3 } })
		.png()
		.toBuffer()
}

describe('image integrity', () => {
	describe('blockiness detection', () => {
		it('detects an image converted from a low-quality JPEG', async () => {
			const pngFromJpeg = await generateJpegDerivedPng()
			const result = await detectBlockyJpeg(pngFromJpeg)

			expect(result.isTooBlocky).toBe(true)
		})

		it('does not flag a genuine lossless image', async () => {
			const genuinePng = await generateGenuinePng()
			const result = await detectBlockyJpeg(genuinePng)

			expect(result.isTooBlocky).toBe(false)
		})
	})

	describe('repository images', async () => {
		inkscapeTestsEnabled = process.env.WALLETBEAT_ENV === 'CI' || (await isInkscapeAvailable())

		// The whitelist is mutated in place as the scan discovers clean, new,
		// changed, or removed images, then written back to disk.
		const whitelist = await loadCleanImageHashes()

		const failures: ImageFailure[] = []
		const inkscapeRequiredFailures: { filePath: string; test: string }[] = []
		const scannedFiles: string[] = []
		const skippedFiles: string[] = []
		// Files that currently have at least one applicable integrity test.
		// Only these are eligible for the whitelist; entries for anything else
		// (deleted, or excluded from every test) are pruned below.
		const trackedFiles: Set<string> = new Set()

		await crawlCodebase({
			ignore: [
				'.git',
				await GitIgnoredFiles(),
				'node_modules',
				'dist',
				'.cache',
				'.astro',
				'src/generated',
			],
			complexTraversalFn: async (entryBase, getFullEntry) => {
				if (entryBase.type !== CodebaseEntryType.FILE) {
					return
				}

				if (!isImageExtension(extensionOf(entryBase.path))) {
					return
				}

				const entry = await getFullEntry()

				if (entry.type !== CodebaseEntryType.FILE) {
					throw new Error('inconsistent type')
				}

				const imageEntry: ImageFileEntry = {
					filePath: entry.path,
					raw: entry.raw,
					contents: entry.contents,
				}

				const appliedTests = IMAGE_TESTS.filter(test => test.appliesTo(imageEntry))

				const hash = crypto.createHash('sha256').update(entry.raw).digest('hex')
				const existing = whitelist[entry.path]

				// When the inkscape CLI is unavailable, an inkscape-requiring
				// test cannot run. If the image does not already have a valid
				// cached entry for that test, the cache cannot be kept up to
				// date, so the test must fail and instruct the user to install
				// inkscape.
				if (!inkscapeTestsEnabled) {
					for (const test of appliedTests) {
						if (test.requiresInkscape && !hasValidCachedEntry(existing, hash, [test.name])) {
							inkscapeRequiredFailures.push({ filePath: entry.path, test: test.name })
						}
					}
				}

				const applicableTests = appliedTests.filter(
					test => inkscapeTestsEnabled || !test.requiresInkscape,
				)

				// Images with no applicable tests have nothing to verify and
				// are not tracked in the whitelist.
				if (applicableTests.length === 0) {
					return
				}

				trackedFiles.add(entry.path)

				if (
					hasValidCachedEntry(
						existing,
						hash,
						applicableTests.map(test => test.name),
					)
				) {
					skippedFiles.push(entry.path)

					return
				}

				scannedFiles.push(entry.path)

				const passedTests: string[] = []
				let fileFailed = false

				for (const test of applicableTests) {
					const result = await test.run(imageEntry)

					if (result.pass) {
						passedTests.push(test.name)
					} else {
						fileFailed = true
						failures.push({
							filePath: entry.path,
							test: test.name,
							score: result.score,
							detail: result.detail,
						})
					}
				}

				if (!fileFailed) {
					whitelist[entry.path] = { hash, passedTests }
				}
			},
		})

		// Prune whitelist entries for images that are no longer tracked: either
		// the file no longer exists, or it is excluded from every integrity test.
		for (const key of Object.keys(whitelist)) {
			if (!trackedFiles.has(key)) {
				delete whitelist[key]
			}
		}

		// Persist the self-updated whitelist. If this write fails, the test
		// fails, which is the intended "succeed only if the JSON update succeeds"
		// contract.
		await saveCleanImageHashes(whitelist)

		it('found image files to check', () => {
			const total = scannedFiles.length + skippedFiles.length

			expect(total, 'No image files were found by the crawler').toBeGreaterThan(0)
		})

		it('no images fail any integrity test', () => {
			if (failures.length > 0) {
				failures.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

				const message =
					'The following image files fail one or more integrity tests:\n\n' +
					failures
						.map(f => {
							const score = f.score === undefined ? '' : ` (blockiness ${f.score.toFixed(3)})`
							const detail = f.detail === undefined ? '' : ` — ${f.detail}`

							return `  ${f.filePath}\n    test: ${f.test}${score}${detail}`
						})
						.join('\n\n') +
					'\n\nFix these images (re-encode at higher quality or optimize the SVG).\n'

				console.error(message)
				expect(
					failures.length,
					`${failures.length} image file(s) fail one or more integrity tests. See error output for details.`,
				).toBe(0)
			}
		})

		it('no inkscape-requiring test is needed without inkscape installed', () => {
			if (inkscapeRequiredFailures.length > 0) {
				const message =
					'The following images need an inkscape-requiring test to keep ' +
					'verified-clean-images.json up to date, but the inkscape CLI is ' +
					'not installed:\n\n' +
					inkscapeRequiredFailures.map(f => `  ${f.filePath} (test: ${f.test})`).join('\n') +
					'\n\nInstall the inkscape CLI and re-run the tests to verify these images.\n'

				expect(
					inkscapeRequiredFailures.length,
					`${inkscapeRequiredFailures.length} image(s) require the inkscape CLI to be verified.\n${message}`,
				).toBe(0)
			}
		})

		it('whitelist was persisted and reflects the repository', async () => {
			// Round-trip: the file on disk must parse and match the in-memory
			// whitelist that was just written, confirming the self-update worked.
			const persisted = parseCleanImageHashes(await fs.readFile(WHITELIST_PATH, 'utf8'))

			expect(persisted).toEqual(whitelist)
		})
	})
})
