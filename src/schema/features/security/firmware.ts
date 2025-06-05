import type { WithRef } from '@/schema/reference'

export enum FirmwareType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface FirmwareSupport {
	type: FirmwareType
	url?: string
	details?: string
	silentUpdateProtection: FirmwareType
	firmwareOpenSource: FirmwareType
	reproducibleBuilds: FirmwareType
	customFirmware: FirmwareType
}

export type FirmwareImplementation = WithRef<FirmwareSupport>
