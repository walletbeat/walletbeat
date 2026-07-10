import type { EvaluationDetailProps } from '@/schema/attributes'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bug-bounty'

import { component, type Content } from '../content'

export interface SecurityAuditsDetailsProps extends EvaluationDetailProps<SecurityAuditsMetadata> {
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean

	/** Markdown explaining the bug bounty program evaluation. */
	bugBountyDetails: string
}

export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsProps
}

export function securityAuditsDetailsContent(
	bakedProps: Omit<SecurityAuditsDetailsProps, keyof EvaluationDetailProps<SecurityAuditsMetadata>>,
): Content<{ WALLET_NAME: string }> {
	return component<SecurityAuditsDetailsContent, keyof typeof bakedProps>(
		'SecurityAuditsDetails',
		bakedProps,
	)
}
