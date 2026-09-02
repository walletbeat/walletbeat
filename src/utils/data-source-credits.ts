import type { DataSource } from '@/schema/data-sources'
import type { FullyQualifiedReference } from '@/schema/reference'
import type { LabeledUrl } from '@/schema/url'
import { assertNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

export interface DataSourceCredit {
	source: DataSource
	reportUrls: NonEmptyArray<LabeledUrl>
}

/**
 * Group stamped references into one credit per data source.
 * Unstamped refs are excluded. Credits and report URLs keep first-seen order.
 */
export function computeDataSourceCredits(
	references: FullyQualifiedReference[],
): DataSourceCredit[] {
	const credits: DataSourceCredit[] = []
	const indexBySourceId = new Map<string, number>()

	for (const ref of references) {
		if (ref.source === undefined) {
			continue
		}

		const source = ref.source
		const sourceId = source.entity.id
		const reportLabel = `${source.entity.name} report`
		const existingIndex = indexBySourceId.get(sourceId)

		if (existingIndex === undefined) {
			const reportUrls: LabeledUrl[] = []
			const seenUrls = new Set<string>()

			for (const { url } of ref.urls) {
				if (seenUrls.has(url)) {
					continue
				}

				seenUrls.add(url)
				reportUrls.push({ label: reportLabel, url })
			}

			indexBySourceId.set(sourceId, credits.length)
			credits.push({
				source,
				reportUrls: assertNonEmptyArray(reportUrls),
			})
			continue
		}

		const credit = credits[existingIndex]

		if (credit === undefined) {
			throw new Error(`missing data source credit at index ${existingIndex}`)
		}

		const seenUrls = new Set(credit.reportUrls.map(labeled => labeled.url))
		const reportUrls: LabeledUrl[] = [...credit.reportUrls]

		for (const { url } of ref.urls) {
			if (seenUrls.has(url)) {
				continue
			}

			seenUrls.add(url)
			reportUrls.push({ label: reportLabel, url })
		}

		credits[existingIndex] = {
			source: credit.source,
			reportUrls: assertNonEmptyArray(reportUrls),
		}
	}

	return credits
}
