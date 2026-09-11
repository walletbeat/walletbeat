import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { format, resolveConfig } from 'prettier'
import sharp from 'sharp'
import { type Config, loadConfig, optimize } from 'svgo'
import { describe, expect, it } from 'vitest'

import { detectBlockyJpeg } from '@/tools/image-integrity/jpeg-detector-lib'
import { isSameJson } from '@/utils/json'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from './utils/codebase'

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

/** File extensions that carry raster pixels and so can exhibit JPEG blockiness. */
const RASTER_EXTENSIONS: Set<string> = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'])

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
 * the icon-font SVG emitted by the generator), so re-checking them on every
 * run would be wasteful and noisy.
 */
const SVG_OPTIMIZATION_EXCLUDED: Set<string> = new Set([
	'governance/treasury/treasury-expenses-over-time.svg',
	'governance/treasury/treasury-expenses-breakdown.svg',
	'src/assets/fonts/wbicons/wbicons.svg',
])

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
	appliesTo: entry =>
		extensionOf(entry.filePath) === '.svg' && !SVG_OPTIMIZATION_EXCLUDED.has(entry.filePath),
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
	'src/assets/fonts/wbicons/wbicons.svg',
])
/**
 * Detect SVGs that are disguised raster images (mostly an embedded base64
 * data URI rather than genuine vector content). Applies to every SVG.
 */
const SVG_VECTOR_TEST: ImageTest = {
	name: 'svg-vector',
	appliesTo: entry =>
		extensionOf(entry.filePath) === '.svg' && !SVG_VECTOR_EXCLUDED.has(entry.filePath),
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

/** All integrity tests, in the order they should be reported. */
const IMAGE_TESTS: ImageTest[] = [BLOCKINESS_TEST, SVG_OPTIMIZED_TEST, SVG_VECTOR_TEST]

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
		// The whitelist is mutated in place as the scan discovers clean, new,
		// changed, or removed images, then written back to disk.
		const whitelist = await loadCleanImageHashes()

		const failures: ImageFailure[] = []
		const scannedFiles: string[] = []
		const skippedFiles: string[] = []
		// Files that currently have at least one applicable integrity test.
		// Only these are eligible for the whitelist; entries for anything else
		// (deleted, or excluded from every test) are pruned below.
		const trackedFiles: Set<string> = new Set()

		await crawlCodebase({
			ignore: ['.git', 'node_modules', 'dist', '.cache', '.astro', 'src/generated'],
			complexTraversalFn: async (entryBase, getFullEntry) => {
				if (entryBase.type !== CodebaseEntryType.FILE) {
					return
				}

				const ext = extensionOf(entryBase.path)

				if (!RASTER_EXTENSIONS.has(ext) && ext !== '.svg') {
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

				const applicableTests = IMAGE_TESTS.filter(test => test.appliesTo(imageEntry))

				// Images with no applicable tests have nothing to verify and
				// are not tracked in the whitelist.
				if (applicableTests.length === 0) {
					return
				}

				trackedFiles.add(entry.path)

				const hash = crypto.createHash('sha256').update(entry.raw).digest('hex')
				const existing = whitelist[entry.path]

				// Skip if already verified clean, unchanged, and every currently
				// applicable test has passed for it.
				if (
					existing !== undefined &&
					existing.hash === hash &&
					applicableTests.every(test => existing.passedTests.includes(test.name))
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

		it('whitelist was persisted and reflects the repository', async () => {
			// Round-trip: the file on disk must parse and match the in-memory
			// whitelist that was just written, confirming the self-update worked.
			const persisted = parseCleanImageHashes(await fs.readFile(WHITELIST_PATH, 'utf8'))

			expect(persisted).toEqual(whitelist)
		})
	})
})
