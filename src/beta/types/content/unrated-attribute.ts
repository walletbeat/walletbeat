import type { EvaluationData, Value } from '@/beta/schema/attributes';
import { component, type Renderable } from '../content';

export interface UnratedAttributeProps<V extends Value> extends EvaluationData<V> {}

export interface UnratedAttributeContent<V extends Value> {
  component: 'UnratedAttribute';
  componentProps: UnratedAttributeProps<V>;
}

export function unratedAttributeContent<V extends Value>(): Renderable<EvaluationData<V>> {
  return component<UnratedAttributeContent<V>, never>('UnratedAttribute', {});
}
