import type { EvaluationData } from '@/schema/attributes'
import { component, type Renderable } from '../content'
import type { FundingValue } from '@/schema/attributes/transparency/funding'
import type { Monetization } from '@/schema/features/transparency/monetization'

export interface FundingDetailsProps extends EvaluationData<FundingValue> {
	monetization: Monetization
}

export interface FundingDetailsContent {
	component: 'FundingDetails'
	componentProps: FundingDetailsProps
}

export function fundingDetailsContent(
	bakedProps: Omit<FundingDetailsProps, keyof EvaluationData<FundingValue>>,
): Renderable<EvaluationData<FundingValue>> {
	return component<FundingDetailsContent, keyof typeof bakedProps>('FundingDetails', bakedProps)
}
