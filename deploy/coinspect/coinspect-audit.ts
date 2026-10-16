import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { softwareWallets } from '@/data/software-wallets'
import {
	coinspectPlatformVariant,
	type CoinspectReport,
	coinspectScoreRefs,
	coinspectScoreValue,
	coinspectVariantScore,
} from '@/schema/coinspect'
import { coinspectDataSource } from '@/schema/data-sources'
import { isMaybeSupported } from '@/schema/features/support'
import { hasRefs, refs } from '@/schema/reference'
import { resolveFeature, type Variant } from '@/schema/variants'
import { nonEmptyKeys } from '@/types/utils/non-empty'
import { getRepositoryRoot } from '@/utils/codebase'
import { isRecord } from '@/utils/json'

import { coinspectChecks, isCoinspectNoValue, isSkippedCoinspectCheck } from './check-mapping'

const REPORTS_DIR = 'data/coinspect/current-reports'

/** How the wallet data uses the vendored Coinspect reports. */
export interface CoinspectAudit {
	/** Blocking: a field is still null although Coinspect has a value for it. */
	unusedValues: readonly string[]
	/** Blocking: a field carries Coinspect references that do not match its wallet and variant. */
	wrongReports: readonly string[]
	/** Non-blocking: Android and iOS reports disagree, so the mobile field stays empty. */
	platformConflicts: readonly string[]
	/** Non-blocking: a report covers a platform the wallet has no variant for. */
	untrackedPlatforms: readonly string[]
	/** Non-blocking: a researched value disagrees with what Coinspect would produce. */
	contradictions: readonly string[]
}

function isCoinspectReport(value: unknown): value is CoinspectReport {
	if (
		!isRecord(value) ||
		typeof value.walletUID !== 'string' ||
		typeof value.walletMakerUID !== 'string' ||
		typeof value.platform !== 'string' ||
		typeof value.date !== 'string' ||
		!isRecord(value.scores) ||
		!Array.isArray(value.scores.categories)
	) {
		return false
	}

	return value.scores.categories.every(
		(category: unknown) =>
			isRecord(category) &&
			Array.isArray(category.checkResults) &&
			category.checkResults.every(
				(result: unknown) =>
					isRecord(result) &&
					typeof result.checkUID === 'string' &&
					typeof result.result === 'number',
			),
	)
}

function loadReports(): CoinspectReport[] {
	const reportsDir = path.join(getRepositoryRoot(), REPORTS_DIR)
	const reports: CoinspectReport[] = []

	for (const entry of fs.readdirSync(reportsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue
		}

		for (const file of fs.readdirSync(path.join(reportsDir, entry.name), { withFileTypes: true })) {
			if (!file.isFile() || !file.name.endsWith('.json')) {
				continue
			}

			const reportPath = path.join(reportsDir, entry.name, file.name)
			const parsed: unknown = JSON.parse(fs.readFileSync(reportPath, { encoding: 'utf-8' }))

			if (!isCoinspectReport(parsed)) {
				throw new Error(
					`${path.join(REPORTS_DIR, entry.name, file.name)} is not a Coinspect report`,
				)
			}

			reports.push(parsed)
		}
	}

	return reports
}

function propertyOf(blob: unknown, property: PropertyKey): unknown {
	if (!isRecord(blob) || typeof property !== 'string' || !Object.hasOwn(blob, property)) {
		return null
	}

	return blob[property]
}

function withoutRef(value: unknown): unknown {
	if (!isRecord(value)) {
		return value
	}

	return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'ref'))
}

function sameValue(left: unknown, right: unknown): boolean {
	if (isMaybeSupported(left) && isMaybeSupported(right)) {
		return left.support === right.support
	}

	return JSON.stringify(withoutRef(left)) === JSON.stringify(withoutRef(right))
}

function describeValue(value: unknown): string {
	if (isMaybeSupported(value)) {
		return value.support
	}

	return JSON.stringify(withoutRef(value))
}

function coinspectReportUrls(value: unknown): string[] {
	if (!hasRefs(value)) {
		return []
	}

	return refs(value)
		.filter(ref => ref.source?.entity.id === coinspectDataSource.entity.id)
		.flatMap(ref => ref.urls.map(url => url.url))
		.sort()
}

/** Compare the wallet data with what the vendored Coinspect reports say. */
export function coinspectAudit(): CoinspectAudit {
	const reports = loadReports()
	const unusedValues: string[] = []
	const wrongReports: string[] = []
	const platformConflicts: string[] = []
	const untrackedPlatforms: string[] = []
	const contradictions: string[] = []

	for (const wallet of Object.values(softwareWallets)) {
		const coinspectId = wallet.metadata.coinspectId

		if (typeof coinspectId !== 'string') {
			continue
		}

		const walletId = wallet.metadata.id
		const walletReports = reports.filter(report => report.walletMakerUID === coinspectId)
		const variants: Variant[] = nonEmptyKeys(wallet.variants)

		for (const report of walletReports) {
			const variant = coinspectPlatformVariant(report.platform)

			if (!variants.includes(variant)) {
				untrackedPlatforms.push(
					`${walletId}: report ${report.walletUID} has no matching ${variant} variant`,
				)
			}
		}

		for (const [checkId, row] of Object.entries(coinspectChecks)) {
			if (isSkippedCoinspectCheck(row)) {
				continue
			}

			const field = 'property' in row ? String(row.property) : 'feature'

			for (const variant of variants) {
				const where = `${walletId} ${variant} ${field} (${checkId})`
				const variantReports = walletReports.filter(
					report => coinspectPlatformVariant(report.platform) === variant,
				)
				const result = coinspectVariantScore(checkId, variantReports)

				if (result.type === 'PLATFORM_CONFLICT') {
					platformConflicts.push(
						`${where}: ${result.results.map(({ report, score }) => `${report.platform} ${score}`).join(', ')}`,
					)
				}

				const expected = ((): unknown => {
					if (result.type !== 'SCORE') {
						return null
					}

					const value = coinspectScoreValue(checkId, row.scores, result.score)

					return isCoinspectNoValue(value) ? null : value
				})()
				const resolved = resolveFeature(row.target(wallet.features), wallet.variants, variant)
				const actual = 'property' in row ? propertyOf(resolved, row.property) : resolved
				const actualUrls = coinspectReportUrls(actual)

				if (actualUrls.length > 0) {
					if (result.type !== 'SCORE' || expected === null) {
						wrongReports.push(`${where}: has Coinspect references, but Coinspect gives no value`)
						continue
					}

					const expectedUrls = coinspectScoreRefs(checkId, result.score, result.reports)
						.flatMap(ref => ref.urls.map(url => url.url))
						.sort()

					if (
						!sameValue(actual, expected) ||
						JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)
					) {
						wrongReports.push(
							`${where}: Coinspect references do not match the ${variant} reports for ${coinspectId}`,
						)
					}

					continue
				}

				if (expected === null) {
					continue
				}

				if (actual === null) {
					unusedValues.push(
						`${where}: field is null, but Coinspect gives ${describeValue(expected)}`,
					)
				} else if (!sameValue(actual, expected)) {
					contradictions.push(
						`${where}: researched ${describeValue(actual)}, Coinspect ${describeValue(expected)}`,
					)
				}
			}
		}
	}

	return { unusedValues, wrongReports, platformConflicts, untrackedPlatforms, contradictions }
}

/** The non-blocking findings, as a commit message body. Empty when there are none. */
export function formatCoinspectNotes(audit: CoinspectAudit): string {
	const sections: Array<[string, readonly string[]]> = [
		['Platform conflicts (mobile field left empty)', audit.platformConflicts],
		['Reports for platforms Walletbeat does not track', audit.untrackedPlatforms],
		['Researched values that disagree with Coinspect', audit.contradictions],
	]

	return sections
		.filter(([, lines]) => lines.length > 0)
		.map(([title, lines]) => [`${title}:`, ...lines.map(line => `- ${line}`)].join('\n'))
		.join('\n\n')
}

function formatBlockingFindings(audit: CoinspectAudit): string {
	const sections: Array<[string, readonly string[]]> = [
		['Fields left null although Coinspect has a value', audit.unusedValues],
		['Coinspect references that do not match the wallet and variant', audit.wrongReports],
	]

	return sections
		.filter(([, lines]) => lines.length > 0)
		.map(([title, lines]) => [`${title}:`, ...lines.map(line => `  ${line}`)].join('\n'))
		.join('\n')
}

const invokedDirectly =
	process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
	const notesFile = process.argv[2]

	if (notesFile === undefined || notesFile === '') {
		process.stderr.write('Usage: coinspect-audit.ts <notes-file>\n')
		process.exit(2)
	}

	const audit = coinspectAudit()

	fs.writeFileSync(notesFile, formatCoinspectNotes(audit), { encoding: 'utf-8' })

	if (audit.unusedValues.length > 0 || audit.wrongReports.length > 0) {
		process.stderr.write(`${formatBlockingFindings(audit)}\n`)
		process.exit(1)
	}
}
