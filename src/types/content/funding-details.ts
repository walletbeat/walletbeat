import type { EvaluationData } from '@/schema/attributes';
import type { FundingValue } from '@/schema/attributes/transparency/funding';
import type { Monetization } from '@/schema/features/transparency/monetization';

import { type Content, component } from '../content';

export interface FundingDetailsProps extends EvaluationData<FundingValue> {
  monetization: Monetization;
}

export interface FundingDetailsContent {
  component: 'FundingDetails';
  componentProps: FundingDetailsProps;
}

export function fundingDetailsContent(
  bakedProps: Omit<FundingDetailsProps, keyof EvaluationData<FundingValue>>,
): Content<{ WALLET_NAME: string }> {
  return component<FundingDetailsContent, keyof typeof bakedProps>('FundingDetails', bakedProps);
}
