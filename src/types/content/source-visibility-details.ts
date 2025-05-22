import type { EvaluationData } from '@/schema/attributes';
import type { SourceVisibilityValue } from '@/schema/attributes/transparency/source-visibility';

import { component, type Renderable } from '../content';

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
