import type { EvaluationData } from '@/schema/attributes'
import type { ScamPreventionOutcomeMetadata } from '@/schema/attributes/security/scam-prevention'

import { component, type Content } from '../content'

export interface ScamAlertDetailsProps extends EvaluationData<ScamPreventionOutcomeMetadata> {}

export interface ScamAlertDetailsContent {
	component: 'ScamAlertDetails'
	componentProps: ScamAlertDetailsProps
}

export function scamAlertsDetailsContent(
	bakedProps: Omit<ScamAlertDetailsProps, keyof EvaluationData<ScamPreventionOutcomeMetadata>>,
): Content<{ WALLET_NAME: string }> {
	return component<ScamAlertDetailsContent, keyof typeof bakedProps>('ScamAlertDetails', bakedProps)
}
