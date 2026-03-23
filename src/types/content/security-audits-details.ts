import type { EvaluationData } from '@/schema/attributes'
import type { SecurityAuditsOutcomeMetadata } from '@/schema/attributes/security/security-audits'

import { component, type Content } from '../content'

export interface SecurityAuditsDetailsProps extends Omit<
	EvaluationData<SecurityAuditsOutcomeMetadata>,
	'outcome'
> {
	metadata: SecurityAuditsOutcomeMetadata
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean
}

export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsProps
}

export function securityAuditsDetailsContent(
	bakedProps: Omit<
		SecurityAuditsDetailsProps,
		keyof Omit<EvaluationData<SecurityAuditsOutcomeMetadata>, 'outcome'> | 'metadata'
	>,
): Content<{ WALLET_NAME: string }> {
	return component<SecurityAuditsDetailsContent, keyof typeof bakedProps>(
		'SecurityAuditsDetails',
		bakedProps,
	)
}
