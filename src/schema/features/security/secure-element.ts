import type { WithRef } from "@/schema/reference";
export type SecureElementSupport = WithRef<{
	secureElementType: SecureElementType
}>

export enum SecureElementType {
	SE = 'SE',
	HSM = 'HSM',
}