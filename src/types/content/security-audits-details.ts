import type { EvaluationData } from '@/schema/attributes'
import type { SecurityAuditsOutcomeMetadata } from '@/schema/attributes/security/security-audits'

import { component, type Content } from '../content'

export interface SecurityAuditsDetailsProps extends EvaluationData<SecurityAuditsOutcomeMetadata> {
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean
}

export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsProps
}

export function securityAuditsDetailsContent(
	bakedProps: Omit<SecurityAuditsDetailsProps, keyof EvaluationData<SecurityAuditsOutcomeMetadata>>,
): Content<{ WALLET_NAME: string }> {
	return component<SecurityAuditsDetailsContent, keyof typeof bakedProps>(
		'SecurityAuditsDetails',
		bakedProps,
	)
}
