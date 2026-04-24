import type { EvaluationData } from '@/schema/attributes'
import type { EthereumL1LightClient } from '@/schema/features/security/light-client'

import { component, type Content } from '../content'
import type { NonEmptyArray } from '../utils/non-empty'

export interface ChainVerificationDetailsProps extends EvaluationData {
	lightClients: NonEmptyArray<EthereumL1LightClient>
}

export interface ChainVerificationDetailsContent {
	component: 'ChainVerificationDetails'
	componentProps: ChainVerificationDetailsProps
}

export function chainVerificationDetailsContent(
	bakedProps: Omit<ChainVerificationDetailsProps, keyof EvaluationData>,
): Content<{ WALLET_NAME: string }> {
	return component<ChainVerificationDetailsContent, keyof typeof bakedProps>(
		'ChainVerificationDetails',
		bakedProps,
	)
}
