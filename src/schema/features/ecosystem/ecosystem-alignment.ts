import type { WithRef } from '@/schema/reference'

export enum EcosystemAlignmentType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface EcosystemAlignmentSupport {
	type: EcosystemAlignmentType
	url?: string
	details?: string
	eip1559Support: EcosystemAlignmentType
	eip7702Support: EcosystemAlignmentType
	eip4337Support: EcosystemAlignmentType
}

export type EcosystemAlignmentImplementation = WithRef<EcosystemAlignmentSupport>
