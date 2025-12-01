import type { WithRef } from '@/schema/reference'
export type SecureElementSupport = WithRef<{
	secureElementType: SecureElementType
}>

export enum SecureElementType {
	EAL_7 = 'EAL 7',
	EAL_6_PLUS = 'EAL 6+',
	EAL_5_PLUS = 'EAL 5+',
	PCI = 'PCI',
}
