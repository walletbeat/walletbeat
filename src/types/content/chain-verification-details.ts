import type { EvaluationData } from '@/schema/attributes'
import type { EthereumL1LightClient } from '@/schema/features/security/light-client'

import { component, type Content } from '../content'
import type { NonEmptyArray } from '../utils/non-empty'

export interface ChainVerificationDetailsProps extends EvaluationData {
	lightClients: NonEmptyArray<EthereumL1LightClient>
}

export type ChainVerificationDetailsBakedProps = Omit<
	ChainVerificationDetailsProps,
	keyof EvaluationData
>

export interface ChainVerificationDetailsContent {
	component: 'ChainVerificationDetails'
	componentProps: ChainVerificationDetailsBakedProps
}

export function chainVerificationDetailsContent(
	bakedProps: ChainVerificationDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('ChainVerificationDetails', bakedProps)
}
