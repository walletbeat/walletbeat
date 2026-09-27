import type { EvaluationData } from '@/schema/attributes'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'

import { component, type Content } from '../content'
import { isRecord } from '../utils/record'

export interface ScamAlertDetailsProps extends EvaluationData<ScamPreventionMetadata> {}

export type ScamAlertDetailsBakedProps = Omit<
	ScamAlertDetailsProps,
	keyof EvaluationData<ScamPreventionMetadata>
>

export interface ScamAlertDetailsContent {
	component: 'ScamAlertDetails'
	componentProps: ScamAlertDetailsBakedProps
}

export function isScamPreventionMetadata(value: unknown): value is ScamPreventionMetadata {
	if (!isRecord(value) || !Object.hasOwn(value, 'scamAlerts')) {
		return false
	}

	if (value.scamAlerts === null) {
		return true
	}

	return (
		isRecord(value.scamAlerts) &&
		isRecord(value.scamUrlWarning) &&
		isRecord(value.sendTransactionWarning) &&
		isRecord(value.contractTransactionWarning) &&
		isRecord(value.unlimitedApprovalWarning)
	)
}

export function scamAlertsDetailsContent(
	bakedProps: ScamAlertDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('ScamAlertDetails', bakedProps)
}
