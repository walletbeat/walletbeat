import type { EvaluationData } from '@/schema/attributes'
import type { SecurityAuditsValue } from '@/schema/attributes/security/security-audits'

import { type Content, component } from '../content'

export interface SecurityAuditsDetailsProps extends EvaluationData<SecurityAuditsValue> {
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean
}

export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsProps
}

export function securityAuditsDetailsContent(
	bakedProps: Omit<SecurityAuditsDetailsProps, keyof EvaluationData<SecurityAuditsValue>>,
): Content<{ WALLET_NAME: string }> {
	return component<SecurityAuditsDetailsContent, keyof typeof bakedProps>(
		'SecurityAuditsDetails',
		bakedProps,
	)
}
