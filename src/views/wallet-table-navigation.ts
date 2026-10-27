import { SortDirection, type SortState } from '@/components/table-sort'

import { stageQualificationChoices, type StageQualificationId } from './wallet-table-stage'

export const walletSummarySortChoices: { path: string; sort: SortState<string> | undefined }[] = [
	{ path: '', sort: undefined },
	{ path: 'wallet-asc', sort: { columnId: 'wallet', direction: SortDirection.Ascending } },
	{ path: 'wallet-desc', sort: { columnId: 'wallet', direction: SortDirection.Descending } },
	{ path: 'stage-asc', sort: { columnId: 'stage', direction: SortDirection.Ascending } },
	{ path: 'stage-desc', sort: { columnId: 'stage', direction: SortDirection.Descending } },
	{ path: 'attributes-asc', sort: { columnId: 'overall', direction: SortDirection.Ascending } },
]

export function walletSummarySelection(stage: StageQualificationId, sort: SortState | undefined) {
	const stageChoice = stageQualificationChoices.find(choice => choice.id === stage)
	const sortChoice = walletSummarySortChoices.find(choice =>
		sort === undefined ||
		(sort.columnId === 'overall' && sort.direction === SortDirection.Descending)
			? choice.sort === undefined
			: choice.sort !== undefined &&
				choice.sort.columnId === sort.columnId &&
				choice.sort.direction === sort.direction,
	)

	if (!stageChoice || !sortChoice) {
		return undefined
	}

	return [stageChoice.path, sortChoice.path].filter(Boolean).join('/')
}

export function walletSummaryHref(
	base: string,
	stage: StageQualificationId,
	sort: SortState | undefined,
) {
	const selection = walletSummarySelection(stage, sort)

	return selection === undefined ? undefined : base + selection + (selection ? '/' : '')
}
