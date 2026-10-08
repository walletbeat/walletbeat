import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { type CoinspectCheckRow, coinspectChecks, isSkippedCoinspectCheck } from './check-mapping'

const CHECKS_FILE = 'data/coinspect/config/checks.json'
const REPORTS_DIR = 'data/coinspect/current-reports'

/** Ids that the mapping neither maps nor skips, or rows that no longer exist upstream. */
export interface CoinspectClassificationReport {
	/** Check ids in checks.json or in a report, with no mapping row and no skip. */
	unclassified: readonly string[]
	/** Mapping or skip rows whose id is in neither checks.json nor any report. */
	stale: readonly string[]
	/** Mapped rows whose id is missing from checks.json, so scores cannot be checked. */
	mappedWithoutDefinition: readonly string[]
	/** Mapped rows that omit a score listed in that check's criteria. */
	unhandledScores: readonly string[]
	/** Skip rows whose reason is empty. */
	emptySkipReasons: readonly string[]
}

function repositoryRoot(): string {
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
}

function readJson(filePath: string): unknown {
	const parsed: unknown = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }))

	return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function criteriaScores(check: unknown, checkId: string): number[] {
	if (!isRecord(check) || !Array.isArray(check.criteria)) {
		throw new Error(`${checkId} in checks.json has no criteria array`)
	}

	return check.criteria.map(criterion => {
		if (!isRecord(criterion) || typeof criterion.score !== 'number') {
			throw new Error(`${checkId} in checks.json has a criterion without a numeric score`)
		}

		return criterion.score
	})
}

function checksById(checksPath: string): Map<string, unknown> {
	const parsed = readJson(checksPath)

	if (!isRecord(parsed)) {
		throw new Error(`${CHECKS_FILE} must be a JSON object keyed by check id`)
	}

	return new Map(Object.entries(parsed))
}

function checkIdsFromReport(parsed: unknown, reportPath: string): string[] {
	if (!isRecord(parsed) || !isRecord(parsed.scores) || !Array.isArray(parsed.scores.categories)) {
		throw new Error(`${reportPath} has no scores.categories array`)
	}

	const ids: string[] = []

	for (const category of parsed.scores.categories) {
		if (!isRecord(category) || !Array.isArray(category.checkResults)) {
			throw new Error(`${reportPath} has a category without checkResults`)
		}

		for (const result of category.checkResults) {
			if (!isRecord(result) || typeof result.checkUID !== 'string' || result.checkUID === '') {
				throw new Error(`${reportPath} has a check result without a checkUID`)
			}

			ids.push(result.checkUID)
		}
	}

	return ids
}

function reportCheckIds(reportsDir: string): Set<string> {
	const ids = new Set<string>()

	for (const entry of fs.readdirSync(reportsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue
		}

		const reportDir = path.join(reportsDir, entry.name)

		for (const file of fs.readdirSync(reportDir, { withFileTypes: true })) {
			if (!file.isFile() || !file.name.endsWith('.json')) {
				continue
			}

			const reportPath = path.join(reportDir, file.name)
			const relativePath = path.join(REPORTS_DIR, entry.name, file.name)

			for (const id of checkIdsFromReport(readJson(reportPath), relativePath)) {
				ids.add(id)
			}
		}
	}

	return ids
}

function sorted(ids: Iterable<string>): string[] {
	return [...ids].sort((left, right) => left.localeCompare(right))
}

/** Compare the mapping table with the vendored checks and reports. */
export function coinspectClassificationReport(
	root: string = repositoryRoot(),
): CoinspectClassificationReport {
	const defined = checksById(path.join(root, CHECKS_FILE))
	const used = reportCheckIds(path.join(root, REPORTS_DIR))
	const known = new Set<string>([...defined.keys(), ...used])
	const classified = new Set<string>(Object.keys(coinspectChecks))

	const unclassified = sorted([...known].filter(id => !classified.has(id)))
	const stale = sorted([...classified].filter(id => !known.has(id)))
	const mappedWithoutDefinition: string[] = []
	const unhandledScores: string[] = []
	const emptySkipReasons: string[] = []

	const rows: Readonly<Record<string, CoinspectCheckRow>> = coinspectChecks

	for (const [id, row] of Object.entries(rows)) {
		if (isSkippedCoinspectCheck(row)) {
			if (row.reason.trim() === '') {
				emptySkipReasons.push(id)
			}

			continue
		}

		const definition = defined.get(id)

		if (definition === undefined) {
			mappedWithoutDefinition.push(id)
			continue
		}

		const handled = new Set(Object.keys(row.scores).map(score => Number(score)))

		for (const score of criteriaScores(definition, id)) {
			if (!handled.has(score)) {
				unhandledScores.push(`${id} does not handle score ${score}`)
			}
		}
	}

	return {
		unclassified,
		stale,
		mappedWithoutDefinition: sorted(mappedWithoutDefinition),
		unhandledScores,
		emptySkipReasons: sorted(emptySkipReasons),
	}
}

function reportIsClean(report: CoinspectClassificationReport): boolean {
	return (
		report.unclassified.length === 0 &&
		report.stale.length === 0 &&
		report.mappedWithoutDefinition.length === 0 &&
		report.unhandledScores.length === 0 &&
		report.emptySkipReasons.length === 0
	)
}

function formatReport(report: CoinspectClassificationReport): string {
	const lines: string[] = []

	if (report.unclassified.length > 0) {
		lines.push('Unclassified Coinspect check ids:')

		for (const id of report.unclassified) {
			lines.push(`  ${id}`)
		}
	}

	if (report.stale.length > 0) {
		lines.push('Stale Coinspect check rows:')

		for (const id of report.stale) {
			lines.push(`  ${id}`)
		}
	}

	if (report.mappedWithoutDefinition.length > 0) {
		lines.push('Mapped checks missing from checks.json:')

		for (const id of report.mappedWithoutDefinition) {
			lines.push(`  ${id}`)
		}
	}

	if (report.unhandledScores.length > 0) {
		lines.push('Mapped checks with a score that has no value:')

		for (const line of report.unhandledScores) {
			lines.push(`  ${line}`)
		}
	}

	if (report.emptySkipReasons.length > 0) {
		lines.push('Skipped checks with an empty reason:')

		for (const id of report.emptySkipReasons) {
			lines.push(`  ${id}`)
		}
	}

	return lines.join('\n')
}

const invokedDirectly =
	process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
	const report = coinspectClassificationReport()

	if (!reportIsClean(report)) {
		process.stderr.write(`${formatReport(report)}\n`)
		process.exit(1)
	}
}
