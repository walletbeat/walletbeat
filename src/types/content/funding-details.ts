import type { EvaluationData } from '@/schema/attributes'
import type { Monetization } from '@/schema/features/transparency/monetization'

import { component, type Content } from '../content'

export interface FundingDetailsProps extends EvaluationData {
	monetization: Monetization
}

export type FundingDetailsBakedProps = Omit<FundingDetailsProps, keyof EvaluationData>

export interface FundingDetailsContent {
	component: 'FundingDetails'
	componentProps: FundingDetailsBakedProps
}

export function fundingDetailsContent(
	bakedProps: FundingDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('FundingDetails', bakedProps)
}
