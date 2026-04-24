import type { EvaluationData } from '@/schema/attributes'
import type { Monetization } from '@/schema/features/transparency/monetization'

import { component, type Content } from '../content'

export interface FundingDetailsProps extends EvaluationData {
	monetization: Monetization
}

export interface FundingDetailsContent {
	component: 'FundingDetails'
	componentProps: FundingDetailsProps
}

export function fundingDetailsContent(
	bakedProps: Omit<FundingDetailsProps, keyof EvaluationData>,
): Content<{ WALLET_NAME: string }> {
	return component<FundingDetailsContent, keyof typeof bakedProps>('FundingDetails', bakedProps)
}
