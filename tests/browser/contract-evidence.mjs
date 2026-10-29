import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sourceSnapshot } from './fixtures/source-snapshot.mjs'

export const contractURL = new URL('./wallet-page-requirements.md', import.meta.url)
export const requiredEngines = ['chromium', 'firefox', 'webkit']
const later = new Set(['⚡ Smoothness', '⚡ FramePacing', '⚡ Android'])

/**
 * @typedef {{id: string, status: string, complete?: boolean, mobileProfile?: {touch?: boolean, cpuSlowdown?: number}, [key: string]: unknown}} EvidenceRow
 * @typedef {{source: unknown, contractHash: string, engine: string, origin: string, results: EvidenceRow[]}} Capture
 * @typedef {{name: string, body?: string, path?: string}} Attachment
 */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
	if (!isRecord(value)) {
		throw new Error('Evidence JSON must contain an object')
	}

	return value
}

/** @param {unknown} value @returns {unknown[]} */
function array(value) {
	if (value === undefined) {
		return []
	}

	if (!Array.isArray(value)) {
		throw new Error('Evidence JSON must contain an array')
	}

	return value
}

/** @param {unknown} value @returns {string} */
function string(value) {
	if (typeof value !== 'string') {
		throw new Error('Evidence JSON must contain a string')
	}

	return value
}

/** @param {unknown} value @returns {EvidenceRow[]} */
function evidenceRows(value) {
	return array(value).map(value => {
		const row = record(value)

		if (row.complete !== undefined && typeof row.complete !== 'boolean') {
			throw new Error('Evidence completeness must be boolean')
		}

		let mobileProfile

		if (row.mobileProfile !== undefined) {
			const profile = record(row.mobileProfile)

			if (profile.touch !== undefined && typeof profile.touch !== 'boolean') {
				throw new Error('Mobile touch capability must be boolean')
			}

			if (profile.cpuSlowdown !== undefined && typeof profile.cpuSlowdown !== 'number') {
				throw new Error('Mobile CPU slowdown must be numeric')
			}

			mobileProfile = { ...profile, touch: profile.touch, cpuSlowdown: profile.cpuSlowdown }
		}

		return {
			...row,
			id: string(row.id),
			status: string(row.status),
			complete: row.complete,
			mobileProfile,
		}
	})
}

/** @param {string} id */
function contractID(id) {
	return id.trim().replace(/`([^`]+)`/g, '$1')
}

/** @param {string} contract */
export function parseRequirements(contract) {
	return [...contract.matchAll(/^- \*\*(.+?)\*\* (.+)$/gm)].map(([, id, condition]) => ({
		id: contractID(id),
		condition,
	}))
}

/** @param {string} source */
export function parseProcedures(source) {
	return [...source.matchAll(/^\|([^|]+)\|([^|]+)\|$/gm)]
		.map(([, id, procedure]) => ({ id: contractID(id), procedure: procedure.trim() }))
		.filter(({ id }) => id !== 'Requirement' && !/^-+$/.test(id))
}

/** @param {string} contract @param {unknown} source @param {Capture[]} captures */
export function aggregateContract(contract, source, captures) {
	const requirements = parseRequirements(contract)

	if (
		requirements.length !== 209 ||
		new Set(requirements.map(row => row.id)).size !== requirements.length
	) {
		throw new Error('The authoritative contract must retain all 209 unique requirements')
	}

	const contractHash = createHash('sha256').update(contract).digest('hex')
	/** @type {{origin: string, reason: string}[]} */
	const rejected = []
	/** @type {(EvidenceRow & {engine: string, origin: string})[]} */
	const evidence = []

	for (const capture of captures) {
		if (
			JSON.stringify(capture.source) !== JSON.stringify(source) ||
			capture.contractHash !== contractHash
		) {
			rejected.push({
				origin: capture.origin,
				reason: 'Source or contract does not match this acceptance run',
			})
			continue
		}

		if (!requiredEngines.includes(capture.engine)) {
			throw new Error('Evidence must identify an actual supported browser engine')
		}

		for (const row of capture.results) {
			if (!requirements.some(requirement => requirement.id === row.id)) {
				throw new Error(`Unknown contract ID: ${row.id}`)
			}

			evidence.push({ ...row, engine: capture.engine, origin: capture.origin })
		}
	}
	const results = requirements.map(requirement => {
		const rows = evidence.filter(row => row.id === requirement.id)
		const android = requirement.id === '⚡ Android'
		const engines = android ? ['chromium'] : requiredEngines
		const missingEngines = engines.filter(
			engine =>
				!rows.some(row => row.engine === engine && row.status === 'pass' && row.complete === true),
		)
		const missingMobileProfile =
			android &&
			!rows.some(
				row =>
					row.engine === 'chromium' &&
					row.status === 'pass' &&
					row.complete === true &&
					row.mobileProfile?.touch === true &&
					(row.mobileProfile.cpuSlowdown ?? 0) > 1,
			)

		return {
			...requirement,
			phase: later.has(requirement.id) ? 'performance' : 'first-pass',
			...(android
				? {
						acceptanceClarification:
							'The human clarified Android as a performance target for a low-end Android browser; physical hardware is not required. Native Chromium constrained mobile profiling is acceptable when identified as emulation.',
					}
				: {}),
			status: rows.some(row => row.status === 'fail')
				? 'fail'
				: missingEngines.length || missingMobileProfile
					? 'unverified'
					: 'pass',
			missingEngines,
			missingMobileProfile,
			evidence: rows,
		}
	})

	return {
		source,
		contractHash,
		rejected,
		results,
		firstPassComplete: results
			.filter(row => row.phase !== 'performance')
			.every(row => row.status === 'pass'),
		complete: results.every(row => row.status === 'pass'),
	}
}

/** @param {Attachment} attachment @returns {Promise<unknown>} */
async function attachmentJSON(attachment) {
	if (attachment.body) {
		/** @type {unknown} */
		const value = JSON.parse(Buffer.from(attachment.body, 'base64').toString())

		return value
	}

	if (attachment.path) {
		/** @type {unknown} */
		const value = JSON.parse(await readFile(attachment.path, 'utf8'))

		return value
	}

	throw new Error('JSON evidence attachment has no body or file')
}

/** @param {unknown} report @param {string} origin @returns {Promise<Capture[]>} */
export async function capturesFromPlaywright(report, origin) {
	/** @type {Capture[]} */
	const captures = []

	/** @param {unknown} suites */
	async function visit(suites) {
		for (const suiteValue of array(suites)) {
			const suite = record(suiteValue)

			await visit(suite.suites)

			for (const specValue of array(suite.specs)) {
				const spec = record(specValue)

				for (const testValue of array(spec.tests)) {
					const test = record(testValue)
					const last = array(test.results).at(-1)

					if (last === undefined) {
						continue
					}

					const result = record(last)
					const attachments = array(result.attachments).map(value => {
						const attachment = record(value)

						return {
							name: string(attachment.name),
							body: attachment.body === undefined ? undefined : string(attachment.body),
							path: attachment.path === undefined ? undefined : string(attachment.path),
						}
					})
					const sourceAttachment = attachments.find(
						attachment => attachment.name === 'capture-source',
					)
					const source = sourceAttachment ? await attachmentJSON(sourceAttachment) : null

					for (const attachment of attachments.filter(
						attachment =>
							attachment.name === 'contract-evidence' || attachment.name === 'contract-results',
					)) {
						const data = record(await attachmentJSON(attachment))

						if (
							attachment.name === 'contract-results' &&
							(array(data.errors).length || !data.source)
						) {
							continue
						}

						if (
							attachment.name === 'contract-evidence' &&
							(result.status !== 'passed' || test.status !== 'expected')
						) {
							continue
						}

						const rows = evidenceRows(data.results)

						captures.push({
							source: attachment.name === 'contract-results' ? data.source : source,
							contractHash: string(data.contractHash),
							engine: string(data.engine),
							origin: `${origin}: ${string(spec.title)}`,
							results:
								attachment.name === 'contract-results'
									? rows.map(row => ({
											...row,
											complete: data.completeResponsiveCoverage === true && row.status === 'pass',
										}))
									: rows,
						})
					}
				}
			}
		}
	}
	await visit(record(report).suites)

	return captures
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const directory = process.env.WALLET_PAGE_RESULTS ?? 'test-results/browser'
	const [output = resolve(directory, 'acceptance.json'), ...reports] = process.argv.slice(2)

	if (!reports.length) {
		reports.push(resolve(directory, 'report.json'))
	}

	const captures = (
		await Promise.all(
			reports.map(async origin =>
				capturesFromPlaywright(JSON.parse(await readFile(origin, 'utf8')), origin),
			),
		)
	).flat()
	const result = aggregateContract(
		await readFile(contractURL, 'utf8'),
		await sourceSnapshot(),
		captures,
	)

	await writeFile(output, JSON.stringify(result, null, 2) + '\n')
	process.stdout.write(
		JSON.stringify({
			output,
			firstPassComplete: result.firstPassComplete,
			complete: result.complete,
			rejected: result.rejected.length,
			counts: Object.fromEntries(
				['pass', 'fail', 'unverified'].map(status => [
					status,
					result.results.filter(row => row.status === status).length,
				]),
			),
		}) + '\n',
	)

	if (!result.complete || result.rejected.length) {
		process.exitCode = 1
	}
}
