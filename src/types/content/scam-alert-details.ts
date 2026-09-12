import type { EvaluationData } from '@/schema/attributes'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'

import { component, type Content } from '../content'

export interface ScamAlertDetailsProps extends EvaluationData<ScamPreventionMetadata> {}

export type ScamAlertDetailsBakedProps = Omit<
	ScamAlertDetailsProps,
	keyof EvaluationData<ScamPreventionMetadata>
>

export interface ScamAlertDetailsContent {
	component: 'ScamAlertDetails'
	componentProps: ScamAlertDetailsBakedProps
}

export function scamAlertsDetailsContent(
	bakedProps: ScamAlertDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('ScamAlertDetails', bakedProps)
}
