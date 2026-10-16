import { coinspectRef } from '@/schema/data-sources'
import type { FullyQualifiedReference } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import {
	coinspectChecks,
	type CoinspectNoValue,
	isCoinspectNoValue,
} from '../../deploy/coinspect/check-mapping'

/** The parts of a Coinspect report JSON file that Walletbeat reads. */
export interface CoinspectReport {
	walletUID: string
	walletMakerUID: string
	platform: string
	date: string
	scores: {
		categories: ReadonlyArray<{
			checkResults: ReadonlyArray<{ checkUID: string; result: number }>
		}>
	}
}

const platformVariants: ReadonlyMap<string, Variant> = new Map([
	['Browser', Variant.BROWSER],
	['Android', Variant.MOBILE],
	['Ios', Variant.MOBILE],
])

/** The Walletbeat variant that a Coinspect report's platform belongs to. */
export function coinspectPlatformVariant(platform: string): Variant {
	const variant = platformVariants.get(platform)

	if (variant === undefined) {
		throw new Error(`Unknown Coinspect platform "${platform}"`)
	}

	return variant
}

/** The score a report gives for one check, or null if the report does not include it. */
export function coinspectReportScore(report: CoinspectReport, checkId: string): number | null {
	for (const category of report.scores.categories) {
		for (const result of category.checkResults) {
			if (result.checkUID === checkId) {
				return result.result
			}
		}
	}

	return null
}

/**
 * What the reports for one Walletbeat variant say about one check.
 * Reports that do not include the check are ignored.
 */
export type CoinspectVariantScore =
	| { type: 'NO_SCORE' }
	| { type: 'SCORE'; score: number; reports: NonEmptyArray<CoinspectReport> }
	| {
			type: 'PLATFORM_CONFLICT'
			results: NonEmptyArray<{ report: CoinspectReport; score: number }>
	  }

/** Combine one check's scores across the reports of a single variant. */
export function coinspectVariantScore(
	checkId: string,
	reports: readonly CoinspectReport[],
): CoinspectVariantScore {
	const results: Array<{ report: CoinspectReport; score: number }> = []

	for (const report of reports) {
		const score = coinspectReportScore(report, checkId)

		if (score !== null) {
			results.push({ report, score })
		}
	}

	const [first, ...rest] = results

	if (first === undefined) {
		return { type: 'NO_SCORE' }
	}

	if (rest.some(result => result.score !== first.score)) {
		return { type: 'PLATFORM_CONFLICT', results: [first, ...rest] }
	}

	return {
		type: 'SCORE',
		score: first.score,
		reports: [first.report, ...rest.map(result => result.report)],
	}
}

/** The value a mapped check's score translates to, or `coinspectNoValue`. */
export function coinspectScoreValue<T>(
	checkId: string,
	scores: Readonly<Record<number, T | CoinspectNoValue>>,
	score: number,
): T | CoinspectNoValue {
	if (!Object.hasOwn(scores, score)) {
		throw new Error(`${checkId} has no mapping for score ${score}`)
	}

	return scores[score]
}

/**
 * One Coinspect reference per report, stating the score it gave.
 * The note is Walletbeat's own wording so that upstream text changes cannot
 * fail the site's grammar checks.
 */
export function coinspectScoreRefs(
	checkId: string,
	score: number,
	reports: NonEmptyArray<CoinspectReport>,
): NonEmptyArray<FullyQualifiedReference> {
	const note = `Coinspect scored this wallet ${score} out of 100 on check ${checkId}.`
	const [first, ...rest] = reports

	return [
		coinspectRef({ report: first, check: checkId, note }),
		...rest.map(report => coinspectRef({ report, check: checkId, note })),
	]
}

function assertSingleVariant(checkId: string, reports: NonEmptyArray<CoinspectReport>): void {
	const [first, ...rest] = reports
	const variant = coinspectPlatformVariant(first.platform)

	for (const report of rest) {
		if (report.walletMakerUID !== first.walletMakerUID) {
			throw new Error(
				`${checkId}: reports ${first.walletUID} and ${report.walletUID} are for different wallets`,
			)
		}

		if (coinspectPlatformVariant(report.platform) !== variant) {
			throw new Error(
				`${checkId}: reports ${first.walletUID} and ${report.walletUID} are for different variants`,
			)
		}
	}
}

/**
 * Build the helper that fills one feature field from Coinspect reports.
 * The helper takes the reports for a single variant (Browser for the browser
 * variant; Android and iOS for the mobile variant) and returns null when
 * Coinspect has no usable value or the platforms disagree.
 */
function coinspectFieldHelper<T extends object>(
	checkId: string,
	row: { scores: Readonly<Record<number, T | CoinspectNoValue>> },
): (reports: NonEmptyArray<CoinspectReport>) => T | null {
	return reports => {
		assertSingleVariant(checkId, reports)

		const result = coinspectVariantScore(checkId, reports)

		if (result.type !== 'SCORE') {
			return null
		}

		const value = coinspectScoreValue(checkId, row.scores, result.score)

		if (isCoinspectNoValue(value)) {
			return null
		}

		return { ...value, ref: coinspectScoreRefs(checkId, result.score, result.reports) }
	}
}

/** `security.scamAlerts.scamUrlWarning`, from Coinspect's phishing dApp detection check. */
export const coinspectScamUrlWarning = coinspectFieldHelper(
	'WSR-THRE-003.v1',
	coinspectChecks['WSR-THRE-003.v1'],
)
