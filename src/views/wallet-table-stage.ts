export const defaultStageQualification = 'stage-qualified'
export const stageQualificationChoices = [
	{ id: '', label: 'All', compactLabel: 'All', path: 'all' },
	{ id: defaultStageQualification, label: 'Stage 0+', compactLabel: '0+', path: '' },
	{ id: 'stage-unqualified', label: 'Below Stage 0', compactLabel: '–', path: 'below-stage-0' },
] as const
export type StageQualificationId = (typeof stageQualificationChoices)[number]['id']
