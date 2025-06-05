import type { WithRef } from '@/schema/reference'

export enum SupplyChainDIYType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface SupplyChainDIYSupport {
	type: SupplyChainDIYType
	url?: string
	details?: string
	diyNoNda: SupplyChainDIYType
	componentSourcingComplexity: SupplyChainDIYType
}

export type SupplyChainDIYImplementation = WithRef<SupplyChainDIYSupport>
