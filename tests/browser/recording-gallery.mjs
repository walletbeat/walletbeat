import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual, promisify } from 'node:util'

import { sourceSnapshot } from './fixtures/source-snapshot.mjs'

const run = promisify(execFile)

export const matrixURL = new URL('./recording-matrix.json', import.meta.url)
/** @typedef {{engine: string, width: number, height: number, scenario: string, wallet: string, theme: string, transparency: string}} Cell */
/** @typedef {{name: string, body?: string, path?: string, contentType?: string}} Attachment */
/** @typedef {{source: unknown, provenance: Record<string, unknown>, video: string, frame: Buffer}} Recording */
/** @param {Pick<Cell, 'engine' | 'width' | 'scenario'>} cell */
export const projectName = cell => `recording-${cell.engine}-${cell.width}-${cell.scenario}`
/** @param {unknown} condition @param {string} message @returns {asserts condition} */
function assert(condition, message) {
	if (!condition) {
		throw new Error(message)
	}
}
/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value)

/** @param {unknown} value */
function jsonObject(value) {
	assert(isRecord(value), 'Expected a JSON object')

	return value
}
/** @param {unknown} value @returns {unknown[]} */
function array(value) {
	if (value === undefined) {
		return []
	}

	assert(Array.isArray(value), 'Expected a JSON array')

	return value
}
/** @param {unknown} value */
function string(value) {
	assert(typeof value === 'string', 'Expected a JSON string')

	return value
}
/** @param {unknown} value */
function optionalString(value) {
	return value === undefined ? undefined : string(value)
}
/** @param {unknown} value */
function number(value) {
	assert(typeof value === 'number', 'Expected a JSON number')

	return value
}
/** @param {unknown} value @returns {Cell[]} */
function matrixCells(value) {
	return array(value).map(value => {
		const cell = jsonObject(value)

		return {
			...cell,
			engine: string(cell.engine),
			width: number(cell.width),
			height: number(cell.height),
			scenario: string(cell.scenario),
			wallet: string(cell.wallet),
			theme: string(cell.theme),
			transparency: string(cell.transparency),
		}
	})
}
/** @param {unknown} value */
const escapeHTML = value =>
	String(value).replace(
		/[&<>"']/g,
		character =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
	)

/** @param {unknown} value @returns {Attachment} */
function attachment(value) {
	const data = jsonObject(value)

	return {
		name: string(data.name),
		body: optionalString(data.body),
		path: optionalString(data.path),
		contentType: optionalString(data.contentType),
	}
}
/** @param {unknown} report */
export function recordingTests(report) {
	/** @type {{projectName?: string, projectId?: string, title: string, expectedStatus?: string, status?: string, results: {status?: string, errors: unknown[], retry?: number, attachments: Attachment[]}[]}[]} */
	const tests = []
	/** @param {unknown} suites */
	const visit = suites => {
		for (const value of array(suites)) {
			const suite = jsonObject(value)

			visit(suite.suites)

			for (const value of array(suite.specs)) {
				const spec = jsonObject(value)

				for (const value of array(spec.tests)) {
					const test = jsonObject(value)
					const projectName = optionalString(test.projectName),
						projectId = optionalString(test.projectId)

					if ((projectName ?? projectId)?.startsWith('recording-')) {
						tests.push({
							projectName,
							projectId,
							title: string(spec.title),
							expectedStatus: optionalString(test.expectedStatus),
							status: optionalString(test.status),
							results: array(test.results).map(value => {
								const result = jsonObject(value)

								return {
									status: optionalString(result.status),
									errors: array(result.errors),
									retry: result.retry === undefined ? undefined : number(result.retry),
									attachments: array(result.attachments).map(attachment),
								}
							}),
						})
					}
				}
			}
		}
	}

	visit(jsonObject(report).suites)

	return tests
}

/** @param {unknown} report @param {Cell[]} matrix @param {unknown} expectedSource @param {Map<string, Recording>} records */
export function validateMetadata(report, matrix, expectedSource, records) {
	assert(!array(jsonObject(report).errors).length, 'The Playwright report contains global errors')
	assert(
		matrix.length === 18 && new Set(matrix.map(projectName)).size === 18,
		'The canonical matrix must contain exactly 18 unique cells',
	)
	const tests = recordingTests(report)

	assert(
		tests.length === 18,
		`Expected exactly 18 native recording journeys; found ${tests.length}`,
	)
	const seen = new Set()

	return tests.map(test => {
		const name = test.projectName ?? test.projectId

		assert(name, 'Recording project name is missing')

		assert(!seen.has(name), `Duplicate recording project: ${name}`)
		seen.add(name)
		const cell = matrix.find(cell => projectName(cell) === name)

		assert(cell, `Unknown recording project: ${name}`)
		assert(
			test.expectedStatus === 'passed' && test.status === 'expected' && test.results?.length === 1,
			`${name}: the native journey must pass without retries, skipped or expected-failure results`,
		)
		const result = test.results[0]

		assert(
			result.status === 'passed' && !result.errors?.length && (result.retry ?? 0) === 0,
			`${name}: failed or retried journey`,
		)
		const record = records.get(name)

		assert(record, `${name}: missing recording attachments`)
		const { source, provenance, video, frame } = record

		assert(
			source && provenance && video && frame,
			`${name}: missing capture-source, recording-provenance, video or final-frame`,
		)
		assert(
			isDeepStrictEqual(source, expectedSource) && isDeepStrictEqual(provenance.source, source),
			`${name}: stale or inconsistent source identity`,
		)

		for (const [key, value] of Object.entries(cell)) {
			assert(
				provenance[key] === value,
				`${name}: provenance ${key} differs from the canonical matrix`,
			)
		}
		assert(
			typeof provenance.engineVersion === 'string' && /^\d+\./.test(provenance.engineVersion),
			`${name}: actual browser engine version is missing`,
		)
		assert(
			provenance.nativeInput === true &&
				provenance.nativeCursorCaptured === false &&
				provenance.cursorOverlay === 'computed CSS cursor: pointer, text, default',
			`${name}: native input or honest cursor declaration is missing`,
		)
		const media = jsonObject(provenance.media)

		assert(
			media.dark === (cell.theme === 'dark') && typeof media.reducedTransparency === 'boolean',
			`${name}: actual media observations are missing or inconsistent`,
		)
		assert(
			provenance.transparencyEmulationAvailable === (cell.engine !== 'webkit'),
			`${name}: transparency availability declaration is inconsistent`,
		)

		if (cell.engine !== 'webkit') {
			assert(
				media.reducedTransparency === (cell.transparency === 'reduce'),
				`${name}: actual transparency preference differs from the matrix`,
			)
		}

		assert(
			Array.isArray(provenance.actions) && provenance.actions.length,
			`${name}: native input actions are missing`,
		)
		const actions = array(provenance.actions).map(jsonObject)

		if (cell.scenario === 'linear') {
			assert(
				actions.every(
					action =>
						action.type === 'wheel' &&
						typeof action.value === 'number' &&
						Number.isFinite(action.value) &&
						action.value > 0,
				),
				`${name}: linear journey is not a native forward wheel sequence`,
			)
		} else {
			assert(
				actions.every(action =>
					['toc', 'heading', 'pie', 'top', 'key'].includes(string(action.type)),
				),
				`${name}: unknown alternating input`,
			)
			assert(
				isDeepStrictEqual(
					actions
						.filter(action => ['toc', 'heading', 'pie'].includes(string(action.type)))
						.map(action => action.type),
					['toc', 'heading', 'pie', 'toc', 'heading', 'pie'],
				),
				`${name}: incomplete native alternating journey`,
			)
		}

		return { name, cell, ...record }
	})
}

/** @param {Attachment} attachment @param {string} reportDirectory */
async function attachmentBytes(attachment, reportDirectory) {
	if (attachment.body) {
		return Buffer.from(attachment.body, 'base64')
	}

	assert(attachment.path, `Attachment ${attachment.name} has neither body nor file`)

	return readFile(resolve(reportDirectory, attachment.path))
}

/** @param {unknown} report @param {string} reportDirectory */
async function attachmentRecords(report, reportDirectory) {
	/** @type {Map<string, Recording>} */
	const records = new Map()

	for (const test of recordingTests(report)) {
		const attachments = test.results?.[0]?.attachments ?? []
		/** @param {string} name */
		const one = name => {
			const found = attachments.filter(attachment => attachment.name === name)

			assert(found.length === 1, `${test.projectName}: expected one ${name} attachment`)

			return found[0]
		}
		const video = one('video')

		assert(
			video.path && video.contentType?.startsWith('video/'),
			`${test.projectName}: native video file attachment is missing`,
		)
		const frame = one('final-frame')

		assert(
			frame.contentType === 'image/png',
			`${test.projectName}: final frame must be the native PNG screenshot`,
		)
		const name = test.projectName ?? test.projectId

		assert(name, 'Recording project name is missing')
		const source = /** @type {unknown} */ (
			JSON.parse((await attachmentBytes(one('capture-source'), reportDirectory)).toString())
		)
		const provenance = /** @type {unknown} */ (
			JSON.parse((await attachmentBytes(one('recording-provenance'), reportDirectory)).toString())
		)

		records.set(name, {
			source,
			provenance: jsonObject(provenance),
			video: resolve(reportDirectory, video.path),
			frame: await attachmentBytes(frame, reportDirectory),
		})
	}

	return records
}

/** @param {string} path */
async function digestFile(path) {
	const digest = createHash('sha256')

	for await (const chunk of createReadStream(path)) {
		assert(Buffer.isBuffer(chunk), 'File stream must produce binary chunks')
		digest.update(chunk)
	}

	return digest.digest('hex')
}

/** @param {string} reportPath @param {string} outputDirectory */
export async function buildGallery(reportPath, outputDirectory) {
	const fromRepository = relative(
		fileURLToPath(new URL('../../', import.meta.url)),
		resolve(outputDirectory),
	)

	assert(
		fromRepository.startsWith('..' + '/') || isAbsolute(fromRepository),
		'Gallery output must be outside the repository in the supplied private artifact directory',
	)
	const existing = await readdir(outputDirectory).catch(error => {
		if (isRecord(error) && error.code === 'ENOENT') {
			return []
		}

		throw error
	})

	assert(
		existing.length === 0,
		'Gallery output must be new or empty; preserve earlier evidence in its own directory',
	)
	const before = await sourceSnapshot()
	const reportBytes = await readFile(reportPath)
	/** @type {unknown} */
	const report = JSON.parse(reportBytes.toString())
	const matrix = matrixCells(/** @type {unknown} */ (JSON.parse(await readFile(matrixURL, 'utf8'))))
	const records = validateMetadata(
		report,
		matrix,
		before,
		await attachmentRecords(report, dirname(reportPath)),
	)
	const validated = []

	// Native decoders run serially so validation does not compete with itself.
	for (const record of records) {
		const { stdout } = await run(
			'ffprobe',
			[
				'-v',
				'error',
				'-select_streams',
				'v:0',
				'-show_entries',
				'stream=width,height:format=duration',
				'-of',
				'json',
				record.video,
			],
			{ timeout: 60000, maxBuffer: 1024 * 1024 },
		)
		const probe = jsonObject(/** @type {unknown} */ (JSON.parse(stdout)))
		const streams = array(probe.streams).map(jsonObject)
		const duration = Number(jsonObject(probe.format).duration)

		assert(
			streams.length === 1 &&
				streams[0].width === record.cell.width &&
				streams[0].height === record.cell.height &&
				Number.isFinite(duration) &&
				duration > 0,
			`${record.name}: actual video dimensions or duration are invalid`,
		)
		assert(
			record.frame.length >= 24 &&
				record.frame.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
				record.frame.readUInt32BE(16) === record.cell.width &&
				record.frame.readUInt32BE(20) === record.cell.height,
			`${record.name}: final screenshot dimensions are invalid`,
		)
		await run(
			'ffmpeg',
			[
				'-nostdin',
				'-v',
				'error',
				'-xerror',
				'-i',
				record.video,
				'-map',
				'0:v:0',
				'-f',
				'null',
				'-',
			],
			{ timeout: 600000, maxBuffer: 1024 * 1024 },
		)
		validated.push({ ...record, duration, sha256: await digestFile(record.video) })
	}
	assert(
		isDeepStrictEqual(await sourceSnapshot(), before),
		'Source changed during matrix validation',
	)
	await mkdir(resolve(outputDirectory, 'media'), { recursive: true })
	/** @type {(Cell & {name: string, engineVersion: unknown, duration: number, sha256: string, originalVideo: string, video: string, frame: string, provenance: string})[]} */
	const cells = []
	const manifest = {
		source: before,
		report: resolve(reportPath),
		reportHash: createHash('sha256').update(reportBytes).digest('hex'),
		mediaDecoded: true,
		visualReview:
			'pending human or agent inspection of actual media; decoding is not visual acceptance',
		cells,
	}

	for (const record of validated) {
		const stem = `media/${record.name}`
		const video = `${stem}.webm`,
			frame = `${stem}.png`,
			provenance = `${stem}.json`

		await copyFile(record.video, resolve(outputDirectory, video))
		await writeFile(resolve(outputDirectory, frame), record.frame)
		await writeFile(
			resolve(outputDirectory, provenance),
			JSON.stringify(record.provenance, null, 2) + '\n',
		)
		manifest.cells.push({
			name: record.name,
			...record.cell,
			engineVersion: record.provenance.engineVersion,
			duration: record.duration,
			sha256: record.sha256,
			originalVideo: record.video,
			video,
			frame,
			provenance,
		})
	}
	await writeFile(
		resolve(outputDirectory, 'validation.json'),
		JSON.stringify(manifest, null, 2) + '\n',
	)
	const cards = manifest.cells
		.map(
			cell =>
				`<article><h2>${escapeHTML(cell.name)}</h2><p>${escapeHTML(cell.wallet)} · ${escapeHTML(cell.theme)} · transparency ${escapeHTML(cell.transparency)} · engine ${escapeHTML(cell.engineVersion)} · ${cell.duration.toFixed(1)}s</p><video controls preload="metadata" poster="${cell.frame}" src="${cell.video}"></video><p><a href="${cell.provenance}">Original provenance</a> · <a href="${cell.frame}">Native final screenshot</a></p></article>`,
		)
		.join('\n')

	await writeFile(
		resolve(outputDirectory, 'index.html'),
		`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WalletPage native recording matrix</title><style>body{font:16px system-ui;margin:2rem;background:#151719;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:2rem}article{padding:1rem;background:#23262a;border-radius:1rem}h2{font-size:1rem;overflow-wrap:anywhere}video{width:100%;max-height:75vh;background:black}a{color:#9bd5ff}</style><h1>WalletPage native recording matrix</h1><p>18 source-matched native journeys passed; every video decoded. Visual review remains pending.</p><p>Revision <code>${escapeHTML(before.revision)}</code> · <a href="validation.json">Source and media validation</a></p><main>${cards}</main></html>\n`,
	)

	return {
		gallery: resolve(outputDirectory, 'index.html'),
		recordings: manifest.cells.length,
		visualReview: manifest.visualReview,
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2)

	if (args.includes('--help')) {
		process.stdout.write(
			'Usage: node tests/browser/recording-gallery.mjs FINAL_PLAYWRIGHT_REPORT.json PRIVATE_OUTPUT_DIRECTORY\nRequires ffprobe and ffmpeg on PATH. Validates all18 canonical native journeys against current source, probes dimensions/duration, fully decodes each video, preserves media/provenance and writes index.html plus validation.json. Does not publish or certify visual review.\n',
		)
	} else {
		assert(args.length === 2, 'Use --help for recording gallery usage')
		const reportPath = resolve(args[0]),
			output = resolve(args[1])

		assert(
			!relative(output, reportPath).startsWith('media/'),
			'Output must not overwrite recording inputs',
		)
		process.stdout.write(JSON.stringify(await buildGallery(reportPath, output)) + '\n')
	}
}
