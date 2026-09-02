import coinspectUpstreamCommit from '@/data/coinspect/upstream-commit?raw'
import { coinspect } from '@/data/entities/coinspect'
import type { DataSource } from '@/schema/data-sources'
import type { FullyQualifiedReference } from '@/schema/reference'
import { assertCalendarDate } from '@/types/date'

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
}): FullyQualifiedReference {
	const commit = coinspectUpstreamCommit.trim()
	const url = `https://github.com/coinspect/wallet-security-ranking/blob/${commit}/current-reports/${args.report.walletUID}/${args.report.walletUID}.json`

	return {
		urls: [{ url, label: `Coinspect ${args.check}` }],
		explanation: args.note,
		lastRetrieved: assertCalendarDate(args.report.date.slice(0, 'YYYY-MM-DD'.length)),
		source: coinspectDataSource,
	}
}
