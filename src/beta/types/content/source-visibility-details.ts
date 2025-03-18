import type { EvaluationData } from '@/beta/schema/attributes';
import { component, type Renderable } from '../content';
import type { SourceVisibilityValue } from '@/beta/schema/attributes/transparency/source-visibility';

export interface SourceVisibilityDetailsProps extends EvaluationData<SourceVisibilityValue> {}

export interface SourceVisibilityDetailsContent {
  component: 'SourceVisibilityDetails';
  componentProps: SourceVisibilityDetailsProps;
}

export function sourceVisibilityDetailsContent(): Renderable<
  EvaluationData<SourceVisibilityValue>
> {
  return component<SourceVisibilityDetailsContent, never>('SourceVisibilityDetails', {});
}
