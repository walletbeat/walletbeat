import type { EvaluationData } from '@/schema/attributes'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'

import { component, type Content } from '../content'

export interface ScamAlertDetailsProps extends EvaluationData<ScamPreventionMetadata> {}

export interface ScamAlertDetailsContent {
	component: 'ScamAlertDetails'
	componentProps: ScamAlertDetailsProps
}

export function scamAlertsDetailsContent(
	bakedProps: Omit<ScamAlertDetailsProps, keyof EvaluationData<ScamPreventionMetadata>>,
): Content<{ WALLET_NAME: string }> {
	return component<ScamAlertDetailsContent, keyof typeof bakedProps>('ScamAlertDetails', bakedProps)
}
