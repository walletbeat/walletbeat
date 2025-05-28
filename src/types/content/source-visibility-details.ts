import type { EvaluationData } from '@/schema/attributes';
import type { SourceVisibilityValue } from '@/schema/attributes/transparency/source-visibility';

import { component, type Content } from '../content';

export interface SourceVisibilityDetailsProps extends EvaluationData<SourceVisibilityValue> {}

export interface SourceVisibilityDetailsContent {
  component: 'SourceVisibilityDetails';
  componentProps: SourceVisibilityDetailsProps;
}

export function sourceVisibilityDetailsContent(): Content<{ WALLET_NAME: string }> {
  return component<SourceVisibilityDetailsContent, never>('SourceVisibilityDetails', {});
}
