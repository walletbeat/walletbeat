import coinspectUpstreamCommit from '@/data/coinspect/upstream-commit?raw'
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
	const commit = coinspectUpstreamCommit.trim()
	const url = `https://github.com/coinspect/wallet-security-ranking/blob/${commit}/current-reports/${args.report.walletUID}/${args.report.walletUID}.json`

	return {
		urls: [{ url, label: `Coinspect ${args.check}` }],
		explanation: args.note,
		lastRetrieved: assertCalendarDate(args.report.date.slice(0, 'YYYY-MM-DD'.length)),
		source: coinspectDataSource,
	}
}
