import type { EvaluationData, OutcomeMetadata } from '@/schema/attributes'

import { component, type Content } from '../content'

export interface UnratedAttributeProps<
	_OutcomeMetadata extends OutcomeMetadata,
> extends EvaluationData<_OutcomeMetadata> {}

export interface UnratedAttributeContent {
	component: 'UnratedAttribute'
	componentProps: Record<never, never>
}

export function unratedAttributeContent<_OutcomeMetadata extends OutcomeMetadata>(): Content<{
	WALLET_NAME: string
}> {
	return component('UnratedAttribute', {})
}
