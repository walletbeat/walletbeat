import coinspectChecks from '@/data/coinspect/checks.json'
import { coinspectUpstreamCommit } from '@/data/coinspect/upstream-commit'
import { coinspect } from '@/data/entities/coinspect'
import type { Entity } from '@/schema/entity'
import type { LabeledUrl, Url } from '@/schema/url'
import { assertCalendarDate, type CalendarDate } from '@/types/date'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/**
 * An external dataset that Walletbeat citations may be adapted from.
 * The JSON export and UI id is `entity.id`; `DataSource` has no separate id.
 */
export interface DataSource {
	entity: Entity
	license: { name: string; url: Url }
	/** Credit line shown in the UI; must indicate adaptation for CC BY. */
	attributionText: string
}

export const coinspectDataSource: DataSource = {
	entity: coinspect,
	license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
	attributionText: 'Adapted from "Wallet Security Ranking" by Coinspect.',
}

/**
 * Build a Coinspect-stamped reference. The upstream commit pin is read at
 * build time so `/data` call sites stay unchanged across Coinspect refreshes.
 */
export function coinspectRef(args: {
	report: { walletUID: string; date: string }
	check: string
	note: string
}): {
	urls: NonEmptyArray<LabeledUrl>
	explanation: string
	lastRetrieved: CalendarDate
	source: DataSource
} {
	const commit = coinspectUpstreamCommit
	const url = `https://github.com/coinspect/wallet-security-ranking/blob/${commit}/current-reports/${args.report.walletUID}/${args.report.walletUID}.json`

	return {
		urls: [{ url, label: `Coinspect ${args.check}` }],
		explanation: args.note,
		lastRetrieved: assertCalendarDate(args.report.date.slice(0, 'YYYY-MM-DD'.length)),
		source: coinspectDataSource,
	}
}

/** A Coinspect wallet report, as vendored in `data/coinspect/current-reports/`. */
export interface CoinspectReport {
	walletUID: string
	walletMakerUID: string
	wallet: string
	platform: string
	version: string
	/** ISO 8601 timestamp of the evaluation. */
	date: string
	scores: {
		categories: Array<{
			categoryUID: string
			checkResults: Array<{ checkUID: string; result: number }>
		}>
	}
	results: Array<{
		uid: string
		inputs: Array<{ type: string; value: string | string[] }>
	}>
}

/** A Coinspect check's name and scoring criteria, from `data/coinspect/checks.json`. */
export interface CoinspectCheck {
	name: string
	criteria: Array<{ outcome: string; score: number }>
}

/** One check's result in a Coinspect report, with the check's definition. */
export interface CoinspectCheckResult {
	checkUID: string
	check: CoinspectCheck
	/** Coinspect's score for the check, out of 100. */
	score: number
	/** The criterion outcome that the score stands for. */
	outcome: string
	/** The tester's free-text notes, if any. */
	testerNotes: string | null
}

const coinspectCheckDefinitions: Record<string, CoinspectCheck | undefined> = coinspectChecks

/**
 * Look up a check's result in a Coinspect report. Throws if the report has no
 * result for the check, or if the vendored check definitions do not cover it.
 */
export function coinspectCheckResult(
	report: CoinspectReport,
	checkUID: string,
): CoinspectCheckResult {
	const score = report.scores.categories
		.flatMap(category => category.checkResults)
		.find(checkResult => checkResult.checkUID === checkUID)?.result

	if (score === undefined) {
		throw new Error(`Coinspect report ${report.walletUID} has no result for ${checkUID}`)
	}

	const check = coinspectCheckDefinitions[checkUID]

	if (check === undefined) {
		throw new Error(`Coinspect check ${checkUID} is not defined in data/coinspect/checks.json`)
	}

	const outcome = check.criteria.find(criterion => criterion.score === score)?.outcome

	if (outcome === undefined) {
		throw new Error(`Coinspect check ${checkUID} has no criterion for score ${score}`)
	}

	const testerNotes =
		report.results
			.find(result => result.uid === checkUID)
			?.inputs.find(input => input.type === 'textarea')?.value ?? null

	return {
		checkUID,
		check,
		score,
		outcome,
		testerNotes: typeof testerNotes === 'string' && testerNotes.trim() !== '' ? testerNotes : null,
	}
}

/**
 * Build a reference to one check's result in a Coinspect report. The label
 * names the check; the explanation states the criterion outcome the score
 * stands for, the evaluated version, and `note` if given.
 */
export function coinspectCheckRef(
	report: CoinspectReport,
	checkUID: string,
	note?: string,
): ReturnType<typeof coinspectRef> {
	const { check, score, outcome } = coinspectCheckResult(report, checkUID)

	return coinspectRef({
		report,
		check: check.name,
		note: [
			`Coinspect scored ${report.wallet} (${report.platform}, version ${report.version}) ${score}/100 on "${check.name}": ${outcome}`,
			note,
		]
			.filter(part => part !== undefined)
			.join(' '),
	})
}
