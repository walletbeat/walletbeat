import type { WithRef } from '@/schema/reference'

export enum MaintenanceType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface MaintenanceSupport {
	type: MaintenanceType
	url?: string
	details?: string
	physicalDurability: MaintenanceType
	mtbfDocumentation: MaintenanceType
	repairability: MaintenanceType
	batteryHandling: MaintenanceType
	warrantyExtensions: MaintenanceType
}

export type MaintenanceImplementation = WithRef<MaintenanceSupport>
