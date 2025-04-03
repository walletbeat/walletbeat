import type { EvaluationData } from '@/schema/attributes'
import { component, type Renderable } from '../content'
import type { ScamPreventionValue } from '@/schema/attributes/security/scam-prevention'

export interface ScamAlertDetailsProps extends EvaluationData<ScamPreventionValue> {}

export interface ScamAlertDetailsContent {
	component: 'ScamAlertDetails'
	componentProps: ScamAlertDetailsProps
}

export function scamAlertsDetailsContent(
	bakedProps: Omit<ScamAlertDetailsProps, keyof EvaluationData<ScamPreventionValue>>,
): Renderable<EvaluationData<ScamPreventionValue>> {
	return component<ScamAlertDetailsContent, keyof typeof bakedProps>('ScamAlertDetails', bakedProps)
}
