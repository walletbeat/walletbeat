import type { EvaluationDetailProps } from '@/schema/attributes'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'

import { component, type Content } from '../content'

export interface SecurityAuditsDetailsProps extends EvaluationDetailProps<SecurityAuditsMetadata> {
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean

	/** Markdown explaining the bug bounty program evaluation. */
	bugBountyDetails: string
}

export type SecurityAuditsDetailsBakedProps = Omit<
	SecurityAuditsDetailsProps,
	keyof EvaluationDetailProps<SecurityAuditsMetadata>
>

export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsBakedProps
}

export function securityAuditsDetailsContent(
	bakedProps: SecurityAuditsDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('SecurityAuditsDetails', bakedProps)
}
