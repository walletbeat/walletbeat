import type { EvaluationData, Value } from '@/schema/attributes'

import { component, type Content } from '../content'

export interface UnratedAttributeProps<V extends Value> extends EvaluationData<V> {}

export interface UnratedAttributeContent<V extends Value> {
	component: 'UnratedAttribute'
	componentProps: UnratedAttributeProps<V>
}

export function unratedAttributeContent<V extends Value>(): Content<EvaluationData<V>> {
	return component<UnratedAttributeContent<V>, never>('UnratedAttribute', {})
}
